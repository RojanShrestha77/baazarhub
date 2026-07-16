// Deny-by-default route registration (Phase 2, decision: "Every route
// declares what it needs; undeclared = denied"). A plain express.Router()
// lets you register a route with zero authorization middleware and nobody
// notices until it ships unguarded. createAuthzRouter() makes that
// structurally impossible: every route/post/put/patch/delete call requires
// an explicit authz declaration as its 2nd argument (PUBLIC, or an array of
// gates from src/middleware/authz.js) and throws at import/boot time — not
// test time, not review time — if it's missing or malformed.
import { Router } from "express";

const METHODS = ["get", "post", "put", "patch", "delete"];

// Every router ever created through this factory, so the route-declaration
// enumeration test (tests/authz/route-declarations.test.js) can walk all of
// them without needing to know their mount paths.
const ALL_AUTHZ_ROUTERS = [];

function isValidAuthzDeclaration(authz) {
  if (Array.isArray(authz)) {
    return authz.length > 0 && authz.every((gate) => typeof gate === "function" && gate.__isAuthzGate === true);
  }
  return typeof authz === "function" && authz.__isAuthzGate === true;
}

export function createAuthzRouter() {
  const router = Router();
  ALL_AUTHZ_ROUTERS.push(router);

  for (const method of METHODS) {
    const original = router[method].bind(router);

    router[method] = (path, authz, ...handlers) => {
      if (!isValidAuthzDeclaration(authz)) {
        throw new Error(
          `Route ${method.toUpperCase()} ${path} is missing a valid authz declaration. ` +
            `Pass PUBLIC or an array of gates (requireRole(...), requireTier(...), requireOwnership(...), ` +
            `requireMfaVerified, requireSession) from src/middleware/authz.js as the 2nd argument.`,
        );
      }
      const gates = Array.isArray(authz) ? authz : [authz];
      return original(path, ...gates, ...handlers);
    };
  }

  return router;
}

// Every route registered across every authz router, each with its full
// middleware stack — used by the enumeration test to confirm the first
// entry in every route's stack is a tagged authz gate.
export function listAllRegisteredRoutes() {
  const routes = [];
  for (const router of ALL_AUTHZ_ROUTERS) {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
      for (const method of methods) {
        routes.push({ method: method.toUpperCase(), path: layer.route.path, stack: layer.route.stack });
      }
    }
  }
  return routes;
}
