import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers — helmet sets Content-Security-Policy, X-Frame-Options,
// Strict-Transport-Security and others. Review each header before your viva.
app.use(helmet());

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(express.json());

// Health check — used by Docker and CI to verify the service is alive
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "bazaarhub-api" });
});

// Placeholder root — replace with your router once you build features
app.get("/", (_req, res) => {
  res.json({ message: "BazaarHub API" });
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

start();
