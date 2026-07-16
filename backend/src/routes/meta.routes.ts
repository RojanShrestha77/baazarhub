// Health check and root — routed through createAuthzRouter() like every
// other route so the enumeration test has no exemptions to special-case.
import mongoose from "mongoose";
import { createAuthzRouter } from "../lib/authzRouter";
import { PUBLIC } from "../middlewares/authz";

const router = createAuthzRouter();

router.get("/api/health", PUBLIC, async (_req, res) => {
  const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({ status: "ok", service: "bazaarhub-api", db: dbState });
});

router.get("/", PUBLIC, (_req, res) => {
  res.json({ message: "BazaarHub API" });
});

export default router;
