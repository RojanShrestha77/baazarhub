export const TOTP_STEP_SECONDS = 30;
// ±1 step (~30s each side) for clock skew, per decision #4/#6 discussion —
// wide enough to tolerate normal device clock drift, narrow enough that it
// doesn't meaningfully widen the brute-force window (still 6-digit codes,
// rate-limited independently — see mfaVerifyLimiter).
export const TOTP_WINDOW_STEPS = 1;
export const TOTP_ISSUER = process.env.TOTP_ISSUER || "BazaarHub";
