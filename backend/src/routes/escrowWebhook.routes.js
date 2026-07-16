import { createAuthzRouter } from "../lib/authzRouter.js";
import { PUBLIC } from "../middleware/authz.js";
import { webhookLimiter } from "../middleware/rateLimiters.js";
import * as escrowService from "../services/escrowService.js";
import * as stripeService from "../services/stripeService.js";

const router = createAuthzRouter();

router.post("/", [PUBLIC], webhookLimiter, async (req, res) => {
  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(401).json({ error: "Missing stripe-signature header" });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: "Webhook secret not configured" });

  let event;
  try {
    event = stripeService.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(401).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object;
      await escrowService.handlePaymentSucceeded(pi.id, event.id);
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
