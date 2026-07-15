import { z } from "zod";

// Password policy (decision #3 / ASVS V2.1): length over complexity, no
// forced rotation. Minimum chosen for meaningful entropy without punishing
// passphrases; maximum is a DoS/consistency guard (argon2 has no problem
// with long inputs, but there's no reason to accept multi-MB request
// bodies as a "password"). No composition rules (uppercase/digit/symbol
// requirements) — ASVS explicitly recommends against them; they push users
// toward predictable patterns more than they add entropy.
const password = z.string().min(12).max(128);
const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email,
  password,
});

// Deliberately NOT validating "does this user exist" here — that's the
// enumeration-sensitive path (decision #7) and belongs in the route
// handler's timing-matched logic, not validation.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

// No body expected. .strict() over .passthrough(): neither handler reads
// req.validatedBody today (harmless either way right now), but .strict()
// rejects unknown fields outright rather than silently accepting and
// discarding them — defense-in-depth if either handler ever changes to
// read from the body.
export const logoutSchema = z.object({}).strict();

export const mfaEnrolSchema = z.object({}).strict();

export const mfaVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
});

export const recoveryCodeVerifySchema = z.object({
  code: z.string().min(1).max(64),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

// Same enumeration caution as loginSchema — don't leak existence via a
// validation error either.
export const passwordResetRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1),
  newPassword: password,
});
