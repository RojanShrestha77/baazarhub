import {
  LOGIN_BACKOFF_BASE_MS,
  LOGIN_BACKOFF_FACTOR,
  LOGIN_BACKOFF_MAX_MS,
  LOGIN_BACKOFF_RESET_AFTER_MS,
} from "../config/session.js";

// Decision #6: per-account exponential backoff, capped — NOT a hard lock.
// A hard lock hands anyone who knows a seller's email a free, zero-skill
// DoS button. This can still be waited out; it only ever adds delay, never
// permanently denies access.
export function isInBackoff(user) {
  const until = user.loginFailure?.nextAttemptAllowedAt;
  return Boolean(until && until.getTime() > Date.now());
}

export function computeBackoffDelayMs(count) {
  const delay = LOGIN_BACKOFF_BASE_MS * LOGIN_BACKOFF_FACTOR ** Math.max(0, count - 1);
  return Math.min(delay, LOGIN_BACKOFF_MAX_MS);
}

export async function registerFailedAttempt(user) {
  const now = Date.now();
  const lastAttemptAt = user.loginFailure?.lastAttemptAt?.getTime();
  const isStale = !lastAttemptAt || now - lastAttemptAt > LOGIN_BACKOFF_RESET_AFTER_MS;

  const nextCount = isStale ? 1 : (user.loginFailure?.count || 0) + 1;
  const delay = computeBackoffDelayMs(nextCount);

  user.loginFailure = {
    count: nextCount,
    lastAttemptAt: new Date(now),
    nextAttemptAllowedAt: new Date(now + delay),
  };
  await user.save();
}

export async function resetFailedAttempts(user) {
  if (!user.loginFailure?.count) return;
  user.loginFailure = { count: 0, lastAttemptAt: undefined, nextAttemptAllowedAt: undefined };
  await user.save();
}
