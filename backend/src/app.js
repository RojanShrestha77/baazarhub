import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { redactString, wrapConsoleError } from "./lib/redact.js";

import authRoutes from "./routes/auth.routes.js";
import metaRoutes from "./routes/meta.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminLogRoutes from "./routes/adminLogs.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import listingRoutes from "./routes/listing.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import escrowRoutes from "./routes/escrow.routes.js";
import escrowWebhookRoutes from "./routes/escrowWebhook.routes.js";
import verificationRoutes from "./routes/verification.routes.js";

// Configured app, exported without connecting to Mongo or calling listen()
// so tests (supertest) can exercise it directly against whatever DB the
// test harness points at (see tests/setup.js). server.js is the only place
// that connects + listens.
export function createApp() {
  const app = express();

  // Security headers — helmet sets Content-Security-Policy, X-Frame-Options,
  // Strict-Transport-Security and others. Review each header before your viva.
  //
  // Phase 3: explicit CSP directives mirroring frontend/nginx.conf's
  // policy, rather than helmet's defaults. This only protects the API's
  // own JSON responses (a browser never renders JSON as HTML, so this
  // isn't the control that stops XSS in the actual app — nginx's header
  // is), but keeping the two declared policies in sync means there's one
  // policy to reason about, not two that could quietly drift apart. See
  // docs/security-decisions.md.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    }),
  );

  app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));

  // Phase 6: redacting morgan — sensitive query params/hdrs masked before logging
  app.use(morgan((tokens, req, res) => {
    return [
      tokens.method(req, res),
      redactString(tokens.url(req, res)),
      tokens.status(req, res),
      tokens["response-time"](req, res), "ms",
    ].join(" ");
  }));

  // Phase 4: Stripe webhook MUST receive raw body for signature verification.
  // express.json() (below) consumes and discards the raw bytes — mounting the
  // webhook BEFORE express.json() with express.raw() preserves the Buffer that
  // stripe.webhooks.constructEvent needs to verify the signature.
  app.use("/api/escrow/webhook", express.raw({ type: "application/json" }), escrowWebhookRoutes);
  app.use(express.json());
  app.use(cookieParser());

  // meta.routes.js carries /api/health (used by Docker/CI) and / — routed
  // through createAuthzRouter() like every other route in the app, rather
  // than left as inline app.get() calls that the authz enumeration test
  // couldn't see.
  app.use("/", metaRoutes);

  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", adminLogRoutes);
  app.use("/api/profiles", profileRoutes);
  app.use("/api/listings", listingRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/escrow", escrowRoutes);
  app.use("/api/verification", verificationRoutes);

  // Phase 6: wrap console.error to redact sensitive data
  wrapConsoleError();

  // Threat model (Information Disclosure): never let a stack trace or raw
  // error message reach the client. Express's default error handler does
  // exactly that if this isn't registered.
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
