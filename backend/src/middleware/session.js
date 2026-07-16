// Session lookup middleware (decision #1 + #2). The session token lives in
// an httpOnly, Secure, SameSite=Lax, __Host-prefixed cookie — never in a
// response body, never in localStorage.

import { findValidSession } from "../services/sessionService.js";
import { User } from "../models/User.js";
import { clearSessionCookie } from "../lib/cookies.js";
import { SESSION_COOKIE_NAME } from "../config/session.js";

export { SESSION_COOKIE_NAME };

// Core lookup, factored out of attachSession so authz gates (Phase 2,
// src/middleware/authz.js) can each call it independently without every
// gate in a composed chain (e.g. [requireSession, requireRole("admin"),
// requireMfaVerified]) re-hitting the DB. Idempotent per-request via
// req.__sessionLoaded — safe to call more than once on the same req.
export async function loadSession(req, res) {
  if (req.__sessionLoaded) return;
  req.__sessionLoaded = true;

  const token = req.cookies?.[SESSION_COOKIE_NAME];

  req.session = null;
  req.user = null;

  if (!token) {
    return;
  }

  // findValidSession (services/sessionService.js) re-checks expiresAt
  // AND absoluteExpiresAt itself, checks revokedAt, and extends the
  // sliding window on success — the TTL index is garbage collection,
  // not enforcement (see models/Session.js). It never distinguishes
  // "expired" vs "revoked" vs "not found" — all three just come back
  // null here, so this middleware can't leak that distinction either
  // (enumeration/reconnaissance parity, decision #7).
  const session = await findValidSession(token);

  if (!session) {
    clearSessionCookie(res);
    return;
  }

  const user = await User.findById(session.userId);
  if (!user) {
    // Session outlived its user (shouldn't happen without a separate
    // user-deletion path, but fail closed rather than assume).
    clearSessionCookie(res);
    return;
  }

  req.session = session;
  req.user = user;
}

// Attach to any route that may optionally have a session (e.g. to vary
// behaviour without requiring auth). Does not reject unauthenticated
// requests — see requireSession below for that.
export async function attachSession(req, res, next) {
  try {
    await loadSession(req, res);
  } catch (err) {
    return next(err);
  }
  next();
}

// Route guard: rejects the request if attachSession didn't find a valid
// session. Mount attachSession first, then this, on any protected route.
async function logAuthzFail(req, detail) {
  try {
    const { logAuthzFailure } = await import("../services/auditService.js");
    logAuthzFailure({ actor: req.user?._id, action: detail, ip: req.ip, userAgent: req.get("user-agent"), metadata: { url: req.originalUrl, method: req.method } });
  } catch {}
}

export function requireSession(req, res, next) {
  if (!req.session) {
    logAuthzFail(req, "require_session");
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
    logAuthzFail(req, "require_mfa_no_session");
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!req.session.mfaVerified) {
    logAuthzFail(req, "require_mfa_not_verified");
    return res.status(403).json({ error: "MFA verification required" });
  }
  next();
}
