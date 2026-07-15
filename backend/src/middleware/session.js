// Session lookup middleware (decision #1 + #2). The session token lives in
// an httpOnly, Secure, SameSite=Lax, __Host-prefixed cookie — never in a
// response body, never in localStorage. This file wires the plumbing
// (cookie name, attaching req.session/req.user, next()); the actual lookup,
// expiry re-check, and sliding-window extension are yours to write.
//
// src/lib/sessionToken.js has hashSessionToken(rawToken) ready to use below.

export const SESSION_COOKIE_NAME = "__Host-bazaarhub-session";

// Attach to any route that may optionally have a session (e.g. to vary
// behaviour without requiring auth). Does not reject unauthenticated
// requests — see requireSession below for that.
export async function attachSession(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  req.session = null;
  req.user = null;

  if (!token) {
    return next();
  }

  // TODO (yours):
  // 1. Hash the raw token with hashSessionToken(token) (never query Session
  //    by raw token — mirrors why we don't store raw tokens either).
  // 2. Look up Session by tokenHash.
  // 3. Re-check expiresAt AND absoluteExpiresAt yourself here — the TTL
  //    index is garbage collection, not enforcement (see Session.js).
  //    A session past either expiry must be treated as invalid even if
  //    the document hasn't been physically reaped yet.
  // 4. Check revokedAt is not set.
  // 5. If valid: extend the sliding window (update expiresAt, capped by
  //    absoluteExpiresAt), update lastSeenAt, and set req.session / req.user.
  // 6. If invalid for any reason: clear the cookie and leave req.session
  //    null — do not distinguish "expired" vs "revoked" vs "not found" in
  //    any response signal (enumeration/reconnaissance parity, decision #7).

  next();
}

// Route guard: rejects the request if attachSession didn't find a valid
// session. Mount attachSession first, then this, on any protected route.
export function requireSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Route guard for routes that require a session that has completed MFA
// (i.e. mfaVerified === true on the Session doc) — distinct from a
// pre-MFA session issued right after password verification. TODO (yours):
// decide which routes need this vs requireSession alone.
export function requireMfaVerified(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!req.session.mfaVerified) {
    return res.status(403).json({ error: "MFA verification required" });
  }
  next();
}
