// Authorization primitives (Phase 2, Slice 1). Two axes on the User doc,
// kept separate per this phase's decisions: role (buyer/seller/admin) and
// sellerTier (unverified -> verified -> trusted, sellers only). Both are
// read fresh from req.user every request (never cached on the session
// doc), so an admin changing either takes effect on the subject's very
// next request — see services/adminService.js.
//
// Every gate here is tagged __isAuthzGate so src/lib/authzRouter.js can
// enforce, at route-registration time, that no route is ever wired up
// without one of these declaring what it needs.
import { loadSession, requireSession as _requireSession, requireMfaVerified as _requireMfaVerified } from "./session.js";

function gate(name, checkFn) {
  const fn = async function authzGate(req, res, next) {
    try {
      await loadSession(req, res);
    } catch (err) {
      return next(err);
    }
    return checkFn(req, res, next);
  };
  Object.defineProperty(fn, "name", { value: name });
  fn.__isAuthzGate = true;
  return fn;
}

// Explicitly-public route marker — required as the declaration for any
// route that intentionally has no authorization requirement (register,
// login, health check, password reset request/confirm). Still loads the
// session (harmless, and lets a public route optionally read req.user if
// it wants to), but never rejects.
export const PUBLIC = gate("public", (req, res, next) => next());

export const requireSession = gate("requireSession", _requireSession);

export const requireMfaVerified = gate("requireMfaVerified", _requireMfaVerified);

async function logAuthzFail(req, detail) {
  try {
    const { logAuthzFailure } = await import("../services/auditService.js");
    logAuthzFailure({ actor: req.user?._id, action: detail, ip: req.ip, userAgent: req.get("user-agent"), metadata: { url: req.originalUrl, method: req.method } });
  } catch {}
}

export function requireRole(...roles) {
  return gate(`requireRole(${roles.join(",")})`, (req, res, next) => {
    if (!req.session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      logAuthzFail(req, `required_role_${roles.join("_")}`);
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

// Tier is a seller-only axis (design decision: role and tier are separate
// axes, not one enum) — a buyer or admin never satisfies a tier check
// regardless of whatever sellerTier default is on their doc.
const TIER_RANK = { unverified: 0, verified: 1, trusted: 2 };

export function requireTier(minTier) {
  if (!(minTier in TIER_RANK)) {
    throw new Error(`requireTier: unknown tier "${minTier}"`);
  }
  return gate(`requireTier(${minTier})`, (req, res, next) => {
    if (!req.session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.role !== "seller") {
      logAuthzFail(req, `required_tier_${minTier}_not_seller`);
      return res.status(403).json({ error: "Forbidden" });
    }
    if (TIER_RANK[req.user.sellerTier] < TIER_RANK[minTier]) {
      logAuthzFail(req, `required_tier_${minTier}_has_${req.user.sellerTier}`);
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  });
}

// Ownership checks resolve the resource server-side and compare against
// the session user — never trust an ID from body/params as proof of
// ownership (Phase 2 decision). resolveOwnerId(req) must load the actual
// resource from the DB and return its owner's id, or null/undefined if the
// resource doesn't exist. Mismatch and "doesn't exist" both come back 404
// — never 403 — so this can't be used to enumerate which resource ids are
// real (same reconnaissance-parity reasoning as decision #7 in Phase 1).
export function requireOwnership(resolveOwnerId) {
  return gate("requireOwnership", async (req, res, next) => {
    if (!req.session) {
      return res.status(401).json({ error: "Authentication required" });
    }
    try {
      const ownerId = await resolveOwnerId(req);
      if (!ownerId || String(ownerId) !== String(req.user._id)) {
        return res.status(404).json({ error: "Not found" });
      }
      next();
    } catch (err) {
      next(err);
    }
  });
}
