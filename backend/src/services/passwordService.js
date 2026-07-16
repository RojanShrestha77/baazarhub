import argon2 from "argon2";

import { ARGON2_OPTIONS } from "../config/argon2.js";

export async function hashPassword(plaintext) {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(hash, plaintext) {
  return argon2.verify(hash, plaintext);
}

// Decision #7: the timing gap between "hash a real stored value" and "skip
// hashing because the user doesn't exist" is the sneaky enumeration leak.
// Precomputed ONCE at module load (server startup), not per-request, and
// not a sleep() — a real argon2id verify against this fixed hash runs on
// the non-existent-user path so the two branches contend for the same
// worker-thread pool the same way under concurrent load, not just look
// similar in single-request timing. See tests/timing/login-timing.js for
// the actual measurement methodology and its limits.
const DUMMY_PASSWORD_PLAINTEXT = "dummy-password-never-compared-to-anything-real";
export const DUMMY_HASH = await argon2.hash(DUMMY_PASSWORD_PLAINTEXT, ARGON2_OPTIONS);

export async function verifyAgainstDummyHash(plaintext) {
  // Result is always discarded — this exists purely to spend the same
  // argon2id wall-clock/CPU cost as a real verification.
  await argon2.verify(DUMMY_HASH, plaintext).catch(() => false);
}

const PASSWORD_HISTORY_LIMIT = 5;
const PASSWORD_EXPIRY_DAYS = 90;

export async function isPasswordReused(user, newPassword) {
  for (const hash of user.passwordHistory || []) {
    if (await argon2.verify(hash, newPassword).catch(() => false)) {
      return true;
    }
  }
  return false;
}

export async function addToPasswordHistory(user, passwordHash) {
  const history = user.passwordHistory || [];
  history.push(passwordHash);
  if (history.length > PASSWORD_HISTORY_LIMIT) {
    history.shift();
  }
  user.passwordHistory = history;
}

export function isPasswordExpired(user) {
  if (!user.passwordChangedAt) return false;
  const elapsed = Date.now() - user.passwordChangedAt.getTime();
  return elapsed > PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}
