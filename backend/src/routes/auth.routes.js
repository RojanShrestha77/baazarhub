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

const router = Router();

function notImplemented(decisionRef) {
  return (_req, res) => {
    res.status(501).json({
      error: "Not implemented",
      note: `TODO: implement per ${decisionRef}`,
    });
  };
}

// ── Registration ────────────────────────────────────────────────────────
// TODO (yours): argon2id-hash the password (decision #3), generic response
// regardless of whether the email already exists, async "someone tried to
// register with your email" notification to the existing address instead
// of a differential response (decision #7).
router.post(
  "/register",
  registerLimiter,
  validateBody(registerSchema),
  notImplemented("decision #3 (hashing) and #7 (enumeration)"),
);

// ── Login ───────────────────────────────────────────────────────────────
// TODO (yours): constant-time-equivalent handling for existent vs
// non-existent users — hash against a precomputed dummy argon2id hash on
// the non-existent path so timing doesn't split (decision #7). Identical
// response body/status/headers on both failure branches. Issue a Session
// doc with mfaVerified: false if the account has MFA enabled, or a fully
// verified session if not. Advance User.loginFailure backoff state on
// failure, reset on success (decision #6).
router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  notImplemented("decision #3, #6 and #7"),
);

// ── Logout (current session only) ──────────────────────────────────────
// TODO (yours): revoke the current Session doc, clear the cookie.
router.post(
  "/logout",
  attachSession,
  requireSession,
  validateBody(logoutSchema),
  notImplemented("decision #1"),
);

// ── Logout everywhere ──────────────────────────────────────────────────
// TODO (yours): revoke every Session doc for req.user, clear the cookie
// on this response.
router.post(
  "/logout-all",
  attachSession,
  requireSession,
  notImplemented("decision #1"),
);

// ── Session refresh ─────────────────────────────────────────────────────
// TODO (yours): this may not need its own route if attachSession already
// performs sliding-window extension on every authenticated request — decide
// whether an explicit refresh endpoint is needed or whether this is a no-op
// that just confirms current session state to the client.
router.post(
  "/session/refresh",
  attachSession,
  requireSession,
  notImplemented("decision #1 (sliding TTL)"),
);

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
