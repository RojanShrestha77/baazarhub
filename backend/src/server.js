import mongoose from "mongoose";

import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    const app = createApp();
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  } catch (err) {
    console.error("Startup error:", err.message);
    process.exit(1);
  }
}

start();
