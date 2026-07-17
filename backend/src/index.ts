import { createApp } from "./app";
import { connectDB } from "./database/mongodb";
import { ensureDummyHash } from "./services/password.service";
import { expireStaleReservations } from "./services/escrow.service";
import { PORT } from "./configs";
import { logger } from "./lib/logger";

// Periodically return stock held by abandoned (unpaid) checkouts. Runs in-
// process; a multi-replica deployment should move this to a single scheduled
// worker (or a Mongo TTL-driven job) so the sweep doesn't run N times over.
const RESERVATION_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

function startReservationSweep() {
  const timer = setInterval(() => {
    expireStaleReservations()
      .then((n) => {
        if (n > 0) logger.info(`Reservation sweep: cancelled ${n} stale order(s), stock restored`);
      })
      .catch((err) => logger.error("Reservation sweep failed", { error: (err as Error).message }));
  }, RESERVATION_SWEEP_INTERVAL_MS);
  timer.unref(); // don't keep the process alive just for the sweep
}

async function start() {
  try {
    await connectDB();
    // Pre-warm the argon2id dummy hash so the first login doesn't pay the
    // one-off computation cost (decision #7 timing parity).
    await ensureDummyHash();
    const app = createApp();
    app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));
    startReservationSweep();
  } catch (err) {
    logger.error("Startup error", { error: (err as Error).message });
    process.exit(1);
  }
}

start();
