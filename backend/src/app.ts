import "dotenv/config";
import express, { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthzRouter } from "./lib/authzRouter";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { redactString, wrapConsoleError } from "./lib/redact";
import { CORS_ORIGIN } from "./configs";

import authRoutes from "./routes/auth.routes";
import metaRoutes from "./routes/meta.routes";
import adminRoutes from "./routes/admin.routes";
import adminLogRoutes from "./routes/admin-logs.routes";
import profileRoutes from "./routes/profile.routes";
import listingRoutes from "./routes/listing.routes";
import categoryRoutes from "./routes/category.routes";
import cartRoutes from "./routes/cart.routes";
import escrowRoutes from "./routes/escrow.routes";
import escrowWebhookRoutes from "./routes/escrow-webhook.routes";
import verificationRoutes from "./routes/verification.routes";

// Configured app, exported without connecting to Mongo or calling listen()
// so tests (supertest) can exercise it directly. index.ts is the only place
// that connects + listens.
// The authz routers are structurally not Express Routers at the type level
// (see lib/authzRouter.ts), so mount them through this cast — they are real
// Router instances at runtime.
const mount = (r: AuthzRouter): RequestHandler => r as unknown as RequestHandler;

export function createApp() {
  const app = express();

  // Security headers — explicit CSP directives mirroring the frontend nginx
  // policy so there's one policy to reason about, not two that could drift.
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

  app.use(cors({ origin: CORS_ORIGIN, credentials: true }));

  // Redacting morgan — sensitive query params/headers masked before logging.
  app.use(
    morgan((tokens, req, res) =>
      [
        tokens.method(req, res),
        redactString(tokens.url(req, res)),
        tokens.status(req, res),
        tokens["response-time"](req, res),
        "ms",
      ].join(" "),
    ),
  );

  // The Stripe webhook MUST receive the raw body for signature verification,
  // so it is mounted BEFORE express.json() with express.raw().
  app.use("/api/escrow/webhook", express.raw({ type: "application/json" }), mount(escrowWebhookRoutes));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/", mount(metaRoutes));
  app.use("/api/auth", mount(authRoutes));
  app.use("/api/admin", mount(adminRoutes));
  app.use("/api/admin", mount(adminLogRoutes));
  app.use("/api/profiles", mount(profileRoutes));
  app.use("/api/listings", mount(listingRoutes));
  app.use("/api/categories", mount(categoryRoutes));
  app.use("/api/cart", mount(cartRoutes));
  app.use("/api/escrow", mount(escrowRoutes));
  app.use("/api/verification", mount(verificationRoutes));

  // Wrap console.error to redact sensitive data.
  wrapConsoleError();

  // Information Disclosure defense: never leak a stack trace or raw error.
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export default createApp;
