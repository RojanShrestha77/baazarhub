import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";

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

  // Health check — used by Docker and CI to verify the service is alive
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "bazaarhub-api" });
  });

  app.use("/api/auth", authRoutes);

  // Placeholder root — replace with your router once you build features
  app.get("/", (_req, res) => {
    res.json({ message: "BazaarHub API" });
  });

  // Threat model (Information Disclosure): never let a stack trace or raw
  // error message reach the client. Express's default error handler does
  // exactly that if this isn't registered.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
