import { Session } from "../models/Session.js";
import { generateSessionToken, hashSessionToken } from "../lib/sessionToken.js";
import { SESSION_SLIDING_WINDOW_MS, SESSION_ABSOLUTE_CAP_MS } from "../config/session.js";

// Decision #1 + session-fixation defense: ALWAYS issue a brand-new session
// document and token here — never reuse or upgrade a pre-existing session
// id across an authentication boundary (anonymous -> authenticated,
// pre-MFA -> post-MFA uses a fresh session too, see markMfaVerified below
// only mutating the field, not the identity, on the same already-trusted
// authenticated session — the id itself was already regenerated at login).
export async function createSession({ userId, mfaVerified, ip, userAgent }) {
  const rawToken = generateSessionToken();
  const now = Date.now();

  const session = await Session.create({
    tokenHash: hashSessionToken(rawToken),
    userId,
    expiresAt: new Date(now + SESSION_SLIDING_WINDOW_MS),
    absoluteExpiresAt: new Date(now + SESSION_ABSOLUTE_CAP_MS),
    mfaVerified: Boolean(mfaVerified),
    ip,
    userAgent,
  });

  return { rawToken, session };
}

// Looks up a session by its raw (cookie) token, re-checking expiry/
// revocation itself rather than trusting the TTL index to have reaped
// anything (see models/Session.js). On success, extends the sliding
// window (capped by absoluteExpiresAt) and updates lastSeenAt.
export async function findValidSession(rawToken) {
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const session = await Session.findOne({ tokenHash });
  if (!session) return null;

  const now = Date.now();
  if (session.revokedAt) return null;
  if (session.absoluteExpiresAt.getTime() <= now) return null;
  if (session.expiresAt.getTime() <= now) return null;

  const nextExpiresAt = Math.min(now + SESSION_SLIDING_WINDOW_MS, session.absoluteExpiresAt.getTime());
  session.expiresAt = new Date(nextExpiresAt);
  session.lastSeenAt = new Date(now);
  await session.save();

  return session;
}

export async function revokeSession(sessionId) {
  await Session.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } });
}

// "Logout everywhere" — every session for the user.
export async function revokeAllSessionsForUser(userId) {
  await Session.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

// Self-service password change (decision #1 follow-up): kill all OTHER
// sessions, keep the one that made the change.
export async function revokeOtherSessionsForUser(userId, currentSessionId) {
  await Session.updateMany(
    { userId, _id: { $ne: currentSessionId }, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function markMfaVerified(sessionId) {
  await Session.updateOne({ _id: sessionId }, { $set: { mfaVerified: true } });
}
