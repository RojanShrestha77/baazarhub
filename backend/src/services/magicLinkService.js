import { PasswordResetToken } from "../models/PasswordResetToken.js";
import { generateSessionToken, hashSessionToken } from "../lib/sessionToken.js";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;

export async function createMagicLinkToken(userId) {
  const rawToken = generateSessionToken();
  await PasswordResetToken.create({
    tokenHash: hashSessionToken(rawToken),
    userId,
    expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
  });
  return rawToken;
}

export async function consumeMagicLinkToken(rawToken) {
  const tokenHash = hashSessionToken(rawToken);
  return PasswordResetToken.findOneAndUpdate(
    { tokenHash, used: false, expiresAt: { $gt: new Date() } },
    { $set: { used: true, usedAt: new Date() } },
    { new: true },
  );
}
