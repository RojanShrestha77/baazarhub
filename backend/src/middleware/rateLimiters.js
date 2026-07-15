import rateLimit from "express-rate-limit";

// Decision #6: hybrid lockout design. Per-IP rate limiting (this file) is
// the PRIMARY defense and applies independently per endpoint group — a
// shared limiter across endpoints would let exhausting one budget (e.g.
// registration) throttle an unrelated one (e.g. login), or worse, let an
// attacker's login attempts eat into a legitimate user's password-reset
// budget. Per-account exponential backoff (NOT a hard lock — see
// User.loginFailure) is separate, stateful, and lives in your auth
// service, not here; these limiters don't know about it.
//
// FIXME: express-rate-limit's default store is in-process memory. That's
// fine for a single container (current docker-compose setup) but breaks
// down the moment this runs as more than one backend replica — each
// instance would enforce its own independent budget, multiplying the
// effective limit by replica count. If/when this scales horizontally,
// swap the store for a shared one (e.g. rate-limit-redis) — flagging now
// so it isn't a silent gap discovered under load later.
//
// FIXME: CAPTCHA (decision #6: triggered after a threshold, not from
// attempt one) is not wired here — these limiters hard-reject over the
// window; there's no partial "show a CAPTCHA instead of blocking" tier
// yet. That's a deliberate scope cut for this pass, not an oversight to
// forget about.

const jsonRateLimitHandler = (_req, res) => {
  res.status(429).json({ error: "Too many requests" });
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Self-review finding (Slice 4): /mfa/enrol does 10 sequential argon2id
// hashes for the recovery-code batch — ~1.7s of real CPU per call,
// measured. Without a limiter, an authenticated attacker (or anyone with
// a stolen session) could hammer it for sustained CPU exhaustion. Tighter
// than mfaVerifyLimiter since each call is far more expensive per-request.
export const mfaEnrolLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

export const mfaVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

export const recoveryCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});
