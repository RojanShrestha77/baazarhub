import { z } from "zod";

// Library wiring only — every schema below is a deliberately permissive
// placeholder. Field rules are yours to write (password policy, email
// format/normalization, TOTP code shape, recovery code format, etc.).
// Keeping these as TODOs rather than guessing at your policy so nothing
// here quietly encodes a security decision you didn't make.

// TODO: email format, password policy (length/breach-list check per the
// threat model's ASVS V2.1 note — length over complexity, no forced
// rotation).
export const registerSchema = z.object({}).passthrough();

// TODO: email + password required. Deliberately NOT validating "does this
// user exist" here — that's the enumeration-sensitive path (decision #7)
// and belongs in the route handler's timing-matched logic, not validation.
export const loginSchema = z.object({}).passthrough();

// TODO: no body expected, but keep this if you want to accept e.g. a
// "logout this device only" vs default distinction later.
export const logoutSchema = z.object({}).passthrough();

// TODO: 6-digit TOTP code shape (or your chosen enrolment payload).
export const mfaEnrolSchema = z.object({}).passthrough();

// TODO: 6-digit numeric TOTP code.
export const mfaVerifySchema = z.object({}).passthrough();

// TODO: recovery code format (matches whatever format you generate them
// in — group length, alphabet).
export const recoveryCodeVerifySchema = z.object({}).passthrough();

// TODO: current password + new password, both required. Enforce the new
// password policy here (same rules as registerSchema — consider sharing).
export const passwordChangeSchema = z.object({}).passthrough();

// TODO: email only. Same enumeration caution as loginSchema — don't leak
// existence via a validation error either (e.g. "no account with this
// email" as a 400 would defeat decision #7's generic-response requirement).
export const passwordResetRequestSchema = z.object({}).passthrough();

// TODO: reset token + new password.
export const passwordResetConfirmSchema = z.object({}).passthrough();
