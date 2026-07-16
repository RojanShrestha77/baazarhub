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

// Phase 2, Slice 2: role/tier changes revoke the subject's sessions and
// write an audit entry — not free operations, and not something a
// compromised-but-MFA'd admin session should be able to hammer unbounded.
export const adminActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Phase 2, Slice 4: data export is a full-account read; bound it the same
// way every other sensitive endpoint is bounded.
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Post-Phase-2-self-attack fix (Finding 1): every profile route needs a
// limiter, not just export — reads and writes get SEPARATE buckets rather
// than sharing one, because they have different legitimate-traffic
// profiles and different abuse profiles. A shared bucket would let a
// burst of normal profile-browsing (reads) eat the budget a legitimate
// user needs for their own profile edits (writes), or vice versa.
//
// Reads (GET /me, GET /:id, avatar GETs) are the highest-volume normal
// traffic on this router (marketplace browsing), so the cap is loose —
// but not absent. Its other job is bounding docs/security-decisions.md's
// ObjectId-enumeration acceptance: GET /:id is the brute-force surface
// that acceptance now depends on being throttled.
export const profileReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Writes (PATCH /me, POST /me/import) are mutating and much lower-volume
// in legitimate use — a user edits their profile occasionally, not every
// few seconds.
export const profileWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

// Avatar upload does disk I/O plus byte-sniffing (fileTypeFromBuffer) on
// every call — more expensive per-request than a JSON PATCH, same
// reasoning as mfaEnrolLimiter being tighter than mfaVerifyLimiter.
export const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});
