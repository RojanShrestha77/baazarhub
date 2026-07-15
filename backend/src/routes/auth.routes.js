import { Router } from "express";

import { attachSession, requireSession } from "../middleware/session.js";
import {
  loginLimiter,
  registerLimiter,
  mfaVerifyLimiter,
  recoveryCodeLimiter,
  passwordResetLimiter,
  passwordChangeLimiter,
} from "../middleware/rateLimiters.js";
import { validateBody } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  logoutSchema,
  mfaEnrolSchema,
  mfaVerifySchema,
  recoveryCodeVerifySchema,
  passwordChangeSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from "../validators/auth.schemas.js";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword, verifyAgainstDummyHash } from "../services/passwordService.js";
import { sendRegistrationConfirmation, sendExistingAccountNotice } from "../services/mailService.js";
import { createSession, revokeSession, revokeAllSessionsForUser } from "../services/sessionService.js";
import { isInBackoff, registerFailedAttempt, resetFailedAttempts } from "../services/loginAttemptService.js";
import { setSessionCookie, clearSessionCookie } from "../lib/cookies.js";

const router = Router();

function notImplemented(decisionRef) {
  return (_req, res) => {
    res.status(501).json({
      error: "Not implemented",
      note: `TODO: implement per ${decisionRef}`,
    });
  };
}

const REGISTER_RESPONSE = {
  message: "If this email address is available, your account has been created — you can now log in.",
};

// ── Registration ────────────────────────────────────────────────────────
// Decision #7: identical response (status, body, content-length) whether
// or not the email is already registered. Existing addresses get a
// notification email instead of a differential HTTP response (sent async
// — never awaited before responding, so response timing can't correlate
// with "an email was actually queued").
router.post("/register", registerLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;

    // Hash unconditionally, before branching on existence — same timing-
    // parity reasoning as login's dummy hash (decision #7). This closes
    // the dominant signal (argon2id cost); a small residual asymmetry
    // remains from findOne-vs-findOne+create DB timing, several orders of
    // magnitude smaller and not addressed here — see login for where the
    // full timing-parity treatment was actually required.
    const passwordHash = await hashPassword(password);
    const existing = await User.findOne({ email });

    if (existing) {
      sendExistingAccountNotice(existing.email);
    } else {
      try {
        // Explicit allow-list, never a req.body spread — role/sellerTier
        // are never client-settable (see models/User.js).
        await User.create({ email, passwordHash });
        sendRegistrationConfirmation(email);
      } catch (err) {
        // Two concurrent registrations for the same new email both pass
        // findOne before either insert lands — the loser hits the unique
        // index (E11000), not a real server error. Treat it the same as
        // "already existed": same generic response, not a 500. Without
        // this, a race condition is a distinguishable status code, which
        // undermines decision #7 under concurrent requests specifically.
        if (err?.code !== 11000) throw err;
      }
    }

    return res.status(201).json(REGISTER_RESPONSE);
  } catch (err) {
    next(err);
  }
});

const LOGIN_FAILURE_RESPONSE = { error: "Invalid email or password" };

// ── Login ───────────────────────────────────────────────────────────────
// Decision #7: real argon2id verify against the user's hash, or against a
// precomputed dummy hash if no such user — never a sleep, never a
// short-circuit. Identical status/body on every failure branch.
//
// FIXME (documented fork — decision #6 vs #7): a naive backoff check
// short-circuits BEFORE hashing once an account is in its backoff window,
// which is fast and therefore distinguishable from the full-cost path a
// fresh account takes — that reopens the exact timing leak decision #7
// closed. Resolved by never letting backoff skip the hash: it only
// affects whether an otherwise-correct password is honored, not whether
// the work happens. Cost: some wasted CPU hashing during an attacker's
// own backoff window — bounded by loginLimiter's per-IP cap regardless.
router.post("/login", loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    const user = await User.findOne({ email });

    const passwordValid = user
      ? await verifyPassword(user.passwordHash, password)
      : await verifyAgainstDummyHash(password).then(() => false);

    const backoffActive = user ? isInBackoff(user) : false;
    const success = passwordValid && !backoffActive;

    if (!success) {
      // NOT awaited: registerFailedAttempt does a Mongoose save() that
      // only happens for existing users. This was originally awaited —
      // the coarse smoke test (tests/auth/login-timing.test.js) caught a
      // real ~65ms gap from it, far larger than the "residual, orders of
      // magnitude smaller" assumption it shipped with. Fire-and-forget,
      // same pattern as sendMailAsync, so response timing can't reflect
      // whether a DB write happened.
      //
      // Only extend backoff on an ACTUALLY wrong password, not on a
      // correct password that was merely blocked by an active backoff
      // window — self-review caught that the naive version let a
      // legitimate user impatiently retrying their correct password
      // during backoff keep re-extending their own lockout indefinitely.
      // Backoff still holds (success stays false either way); it just
      // stops being self-reinforcing.
      if (user && !passwordValid) {
        registerFailedAttempt(user).catch((err) => {
          console.error("registerFailedAttempt failed:", err.message);
        });
      }
      return res.status(401).json(LOGIN_FAILURE_RESPONSE);
    }

    await resetFailedAttempts(user);

    // Decision #1 / session-fixation defense: always a brand-new session,
    // never reused across the anonymous -> authenticated boundary.
    // mfaVerified starts true only if the account has no MFA enrolled —
    // otherwise the client must complete /mfa/verify before this session
    // is treated as fully authenticated (requireMfaVerified).
    const { rawToken } = await createSession({
      userId: user._id,
      mfaVerified: !user.mfaEnabled,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    setSessionCookie(res, rawToken);

    return res.status(200).json({ mfaRequired: user.mfaEnabled });
  } catch (err) {
    next(err);
  }
});

// ── Logout (current session only) ──────────────────────────────────────
router.post(
  "/logout",
  attachSession,
  requireSession,
  validateBody(logoutSchema),
  async (req, res, next) => {
    try {
      await revokeSession(req.session._id);
      clearSessionCookie(res);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
);

// ── Logout everywhere ──────────────────────────────────────────────────
router.post("/logout-all", attachSession, requireSession, async (req, res, next) => {
  try {
    await revokeAllSessionsForUser(req.user._id);
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Session refresh ─────────────────────────────────────────────────────
// No-op beyond what attachSession already does: the sliding-window
// extension happens on every authenticated request via findValidSession
// (sessionService.js), not just this endpoint. This exists so a client can
// explicitly confirm current session state (e.g. after being idle) without
// that being a side effect of some other action.
router.post("/session/refresh", attachSession, requireSession, (req, res) => {
  res.status(200).json({
    mfaVerified: req.session.mfaVerified,
    expiresAt: req.session.expiresAt,
  });
});

// ── MFA enrolment ────────────────────────────────────────────────────────
// TODO (yours): generate a TOTP secret, encrypt it (AES-256-GCM) before
// storage with the current TOTP_KEY_VERSION (decision #4), return the
// provisioning URI/QR to the client ONCE — never re-return the raw secret
// from any other endpoint afterward. Also generate the initial recovery
// code batch here (decision #5) and show them to the user exactly once.
router.post(
  "/mfa/enrol",
  attachSession,
  requireSession,
  validateBody(mfaEnrolSchema),
  notImplemented("decision #4 and #5"),
);

// ── MFA verify (completes login, or confirms enrolment) ─────────────────
// TODO (yours): decrypt the stored secret, verify the TOTP code with a
// bounded window for clock skew, mark the Session's mfaVerified: true on
// success. This endpoint is a brute-force target independent of login's
// rate limit (1,000,000 possible codes) — mfaVerifyLimiter below is
// necessary but not sufficient on its own; consider per-account backoff
// here too, same reasoning as decision #6.
router.post(
  "/mfa/verify",
  attachSession,
  requireSession,
  mfaVerifyLimiter,
  validateBody(mfaVerifySchema),
  notImplemented("decision #4 and #6"),
);

// ── Recovery code verify ─────────────────────────────────────────────────
// TODO (yours): ONE atomic findOneAndUpdate matching
// { userId, codeHash, used: false } setting { used: true, usedAt }. See
// the comment in models/RecoveryCode.js — a separate look-up-then-write
// reintroduces the TOCTOU race tests/auth/recovery-code.test.js checks for.
// Notify the user by email on use (decision #5), independent rate limit
// from MFA verify (decision #6).
router.post(
  "/mfa/recovery-code/verify",
  attachSession,
  requireSession,
  recoveryCodeLimiter,
  validateBody(recoveryCodeVerifySchema),
  notImplemented("decision #5 and #6"),
);

// ── Password change (self-service, already authenticated) ───────────────
// TODO (yours): require current password to be re-verified before
// accepting the change. On success: kill all OTHER sessions, keep the
// current one (decision #1 follow-up — self-service flow). This must be a
// separate code path from password-reset-confirm below, not the same
// function with a flag.
router.post(
  "/password/change",
  attachSession,
  requireSession,
  passwordChangeLimiter,
  validateBody(passwordChangeSchema),
  notImplemented("decision #1 (self-service flow)"),
);

// ── Password reset request ────────────────────────────────────────────────
// TODO (yours): generic response regardless of whether the email exists
// (decision #7). Generate a single-use, time-bound, user-bound reset
// token if the account exists; send it async so response timing doesn't
// correlate with "an email was actually queued".
router.post(
  "/password/reset/request",
  passwordResetLimiter,
  validateBody(passwordResetRequestSchema),
  notImplemented("decision #7"),
);

// ── Password reset confirm ────────────────────────────────────────────────
// TODO (yours): validate the reset token (single-use, not expired, bound
// to this user), set the new password hash. On success: kill ALL sessions,
// no exceptions (decision #1 follow-up — recovery flow, "current session"
// isn't a trustworthy reference point here). Separate code path from
// password/change above.
router.post(
  "/password/reset/confirm",
  passwordResetLimiter,
  validateBody(passwordResetConfirmSchema),
  notImplemented("decision #1 (recovery flow)"),
);

export default router;
