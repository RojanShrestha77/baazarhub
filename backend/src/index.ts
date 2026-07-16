import { createApp } from "./app";
import { connectDB } from "./database/mongodb";
import { ensureDummyHash } from "./services/password.service";
import { PORT } from "./configs";
import { logger } from "./lib/logger";

async function start() {
  try {
    await connectDB();
    // Pre-warm the argon2id dummy hash so the first login doesn't pay the
    // one-off computation cost (decision #7 timing parity).
    await ensureDummyHash();
    const app = createApp();
    app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
  } catch (err) {
    logger.error("Startup error", { error: (err as Error).message });
    process.exit(1);
  }
}

start();
