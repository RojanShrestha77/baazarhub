// Health check and root — split out of app.js so literally every route in
// the app (including these) goes through createAuthzRouter() and carries
// an explicit authz declaration. No exemptions for the enumeration test to
// special-case.
import mongoose from "mongoose";
import { createAuthzRouter } from "../lib/authzRouter.js";
import { PUBLIC } from "../middleware/authz.js";

const router = createAuthzRouter();

router.get("/api/health", PUBLIC, async (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", service: "bazaarhub-api", db: dbState });
});

router.get("/", PUBLIC, (_req, res) => {
  res.json({ message: "BazaarHub API" });
});

export default router;
