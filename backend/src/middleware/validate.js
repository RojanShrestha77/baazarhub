// Validation library wiring (zod). This is plumbing only — the actual
// field rules (password policy, email format, TOTP code shape, etc.) are
// TODO in src/validators/auth.schemas.js, not here.

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten(),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

// Post-Phase-2-self-attack fix (Finding 4): a malformed :id used to reach
// Mongoose as-is and throw a CastError, surfacing as a 500 — distinct from
// the 404 a well-formed-but-nonexistent id gets, which told an attacker
// which ids were even worth trying before touching any real access
// control. This validates the id SHAPE at the route boundary and — this
// is deliberate, not an oversight — responds with the exact same 404 body
// a real "not found" gets, rather than a 400 "invalid format." A distinct
// 400-vs-404 split is itself a smaller version of the same signal: it
// tells an attacker their id was syntactically wrong rather than simply
// absent. Collapsing "malformed" and "doesn't exist" into one response
// means neither the shape nor the existence of an id is observable from
// the outside — the same reconnaissance-parity reasoning Phase 1's
// decision #7 applied to account enumeration, and the same 404-not-403
// choice requireOwnership (middleware/authz.js) already made.
export function validateObjectIdParam(paramName) {
  return (req, res, next) => {
    if (!OBJECT_ID_RE.test(req.params[paramName])) {
      return res.status(404).json({ error: "Not found" });
    }
    next();
  };
}
