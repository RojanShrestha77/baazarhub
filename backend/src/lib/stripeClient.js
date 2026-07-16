import Stripe from "stripe";

const apiVersion = "2025-02-24.acacia";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion })
  : null;

export const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;
