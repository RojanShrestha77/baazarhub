import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Decision #6: hybrid lockout. Per-IP rate limiting (this file) is the
// PRIMARY defense and applies independently per endpoint group — a shared
// limiter would let exhausting one budget throttle an unrelated one.
// Per-account exponential backoff is separate (login-attempt.service).
//
// NOTE: express-rate-limit's default store is in-process memory — fine for a
// single container, but multiplies the effective limit by replica count if
// scaled horizontally. Swap for rate-limit-redis when that happens.
const jsonRateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({ error: "Too many requests" });
};

const base = { standardHeaders: true as const, legacyHeaders: false as const, handler: jsonRateLimitHandler };

export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, ...base });
export const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, ...base });

// Tighter than mfaVerifyLimiter: /mfa/enrol does 10 sequential argon2id
// hashes (~1.7s CPU per call), so it's a CPU-exhaustion target.
export const mfaEnrolLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, ...base });
export const mfaVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, ...base });
export const recoveryCodeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, ...base });
export const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, ...base });
export const passwordChangeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, ...base });
export const magicLinkLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, ...base });
