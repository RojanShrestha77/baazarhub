// Health check and root — split out of app.js so literally every route in
// the app (including these) goes through createAuthzRouter() and carries
// an explicit authz declaration. No exemptions for the enumeration test to
// special-case.
import { createAuthzRouter } from "../lib/authzRouter.js";
import { PUBLIC } from "../middleware/authz.js";

const router = createAuthzRouter();

router.get("/api/health", PUBLIC, (_req, res) => {
  res.json({ status: "ok", service: "bazaarhub-api" });
});

router.get("/", PUBLIC, (_req, res) => {
  res.json({ message: "BazaarHub API" });
});

export default router;
