import Stripe from "stripe";

let _stripe = null;

function getStripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required for payment operations");
    }
    _stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return _stripe;
}

export function resetStripeInstance() {
  _stripe = null;
}

export async function createPaymentIntent(amount, currency, metadata) {
  return getStripe().paymentIntents.create({
    amount,
    currency: currency || "npr",
    metadata,
    capture_method: "manual",
    automatic_payment_methods: { enabled: true },
  });
}

export async function capturePaymentIntent(paymentIntentId) {
  return getStripe().paymentIntents.capture(paymentIntentId);
}

export async function cancelPaymentIntent(paymentIntentId) {
  return getStripe().paymentIntents.cancel(paymentIntentId);
}

export function constructEvent(rawBody, signature, secret) {
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}

// Used by tests to inject a mock stripe instance
export function _setStripeInstance(mock) {
  _stripe = mock;
}
