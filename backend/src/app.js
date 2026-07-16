import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import metaRoutes from "./routes/meta.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import profileRoutes from "./routes/profile.routes.js";

// Configured app, exported without connecting to Mongo or calling listen()
// so tests (supertest) can exercise it directly against whatever DB the
// test harness points at (see tests/setup.js). server.js is the only place
// that connects + listens.
export function createApp() {
  const app = express();

  // Security headers — helmet sets Content-Security-Policy, X-Frame-Options,
  // Strict-Transport-Security and others. Review each header before your viva.
  app.use(helmet());

  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
  app.use(morgan("dev"));
  app.use(express.json());
  app.use(cookieParser());

  // meta.routes.js carries /api/health (used by Docker/CI) and / — routed
  // through createAuthzRouter() like every other route in the app, rather
  // than left as inline app.get() calls that the authz enumeration test
  // couldn't see.
  app.use("/", metaRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/profiles", profileRoutes);

  // Threat model (Information Disclosure): never let a stack trace or raw
  // error message reach the client. Express's default error handler does
  // exactly that if this isn't registered.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
