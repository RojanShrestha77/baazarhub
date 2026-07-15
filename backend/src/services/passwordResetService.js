import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { generateSessionToken, hashSessionToken } from "../lib/sessionToken.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min — short, single-use

export async function createPasswordResetToken(userId) {
  const rawToken = generateSessionToken(); // same CSPRNG generator, reused
  await PasswordResetToken.create({
    tokenHash: hashSessionToken(rawToken),
    userId,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  });
  return rawToken;
}

// Single atomic findOneAndUpdate — unlike recovery codes, this CAN be
// keyed directly on the hash, because the token is hashed with a fast,
// deterministic hash (SHA-256, via hashSessionToken), not argon2id's
// per-call random salt. Re-checks expiresAt itself, same discipline as
// Session/RecoveryCode — the TTL index on the model is GC, not
// enforcement.
export async function consumePasswordResetToken(rawToken) {
  const tokenHash = hashSessionToken(rawToken);
  return PasswordResetToken.findOneAndUpdate(
    { tokenHash, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true, usedAt: new Date() } },
    { new: true },
  );
}

// Self-review finding: a password change through ANY path (self-service
// or a different reset token) must invalidate every OTHER outstanding,
// unused reset token for that user — otherwise a leftover valid token
// from an earlier, abandoned reset request (or one an attacker
// intercepted) can still reset the account again later, even after the
// legitimate user already changed their password some other way.
export async function invalidateAllResetTokensForUser(userId) {
  await PasswordResetToken.updateMany(
    { userId, used: false },
    { $set: { used: true, usedAt: new Date() } },
  );
}
