import { Order } from "../models/Order.js";
import { EscrowEvent } from "../models/EscrowEvent.js";
import { Listing } from "../models/Listing.js";
import { User } from "../models/User.js";
import * as stripeService from "./stripeService.js";
import {
  sendPaymentReceivedNotification,
  sendOrderShippedNotification,
  sendOrderDeliveredNotification,
  sendOrderDisputedNotification,
  sendOrderReleasedNotification,
  sendOrderRefundedNotification,
} from "./mailService.js";

// ── State machine: data-driven transition table ──

const TRANSITIONS = [
  { from: "created",      to: "payment_held", whoCanTrigger: ["webhook"],          guards: [] },
  { from: "payment_held", to: "shipped",      whoCanTrigger: ["seller"],           guards: [] },
  { from: "payment_held", to: "disputed",     whoCanTrigger: ["buyer"],             guards: ["dispute_window_open"] },
  { from: "shipped",      to: "delivered",    whoCanTrigger: ["buyer"],             guards: [] },
  { from: "shipped",      to: "disputed",     whoCanTrigger: ["buyer"],             guards: ["dispute_window_open"] },
  { from: "delivered",    to: "released",     whoCanTrigger: ["system", "admin"],   guards: ["hold_expired"] },
  { from: "disputed",     to: "refunded",     whoCanTrigger: ["admin"],             guards: [] },
  { from: "disputed",     to: "released",     whoCanTrigger: ["admin"],             guards: [] },
];

const GUARDS = {
  dispute_window_open: async (order) => {
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - order.createdAt.getTime() < windowMs;
  },
  hold_expired: async (order) => {
    if (!order.deliveredAt) return false;
    return Date.now() - order.deliveredAt.getTime() >= order.holdDurationMs;
  },
};

export const HOLD_DURATION_MS = {
  trusted: 3 * 24 * 60 * 60 * 1000,
  verified: 7 * 24 * 60 * 60 * 1000,
  unverified: 14 * 24 * 60 * 60 * 1000,
};

// ── Error classes ──

export class TransitionNotAllowedError extends Error {
  constructor(fromStatus, toStatus, reason) {
    super(`Transition from ${fromStatus} to ${toStatus} not allowed: ${reason}`);
    this.name = "TransitionNotAllowedError";
  }
}

export class GuardFailedError extends Error {
  constructor(fromStatus, toStatus, guard) {
    super(`Guard "${guard}" failed for transition ${fromStatus} -> ${toStatus}`);
    this.name = "GuardFailedError";
  }
}

export class InsufficientQuantityError extends Error {
  constructor() {
    super("Insufficient quantity available");
    this.name = "InsufficientQuantityError";
  }
}

export class OrderNotFoundError extends Error {
  constructor() {
    super("Order not found");
    this.name = "OrderNotFoundError";
  }
}

export class OwnListingError extends Error {
  constructor() {
    super("Cannot purchase your own listing");
    this.name = "OwnListingError";
  }
}

export class ListingNotActiveError extends Error {
  constructor() {
    super("Listing is not available for purchase");
    this.name = "ListingNotActiveError";
  }
}

// ── Core: atomic state transition ──

function lookupTransition(fromStatus, toStatus, triggerType) {
  return TRANSITIONS.find(
    (t) => t.from === fromStatus && t.to === toStatus && t.whoCanTrigger.includes(triggerType),
  );
}

export async function transitionOrder(orderId, fromStatus, toStatus, triggerType, actorId, options = {}) {
  const transition = lookupTransition(fromStatus, toStatus, triggerType);
  if (!transition) {
    const order = await Order.findById(orderId).select("status");
    const currentStatus = order ? order.status : "unknown";
    await EscrowEvent.create({
      orderId,
      fromStatus,
      toStatus,
      triggeredBy: actorId,
      triggerType: "system",
      reason: `Illegal transition attempt: ${fromStatus} -> ${toStatus} by ${triggerType} (current: ${currentStatus})`,
      metadata: { illegal: true },
    });
    throw new TransitionNotAllowedError(fromStatus, toStatus, `${triggerType} cannot make this transition`);
  }

  const orderForGuard = await Order.findById(orderId);
  if (!orderForGuard) throw new OrderNotFoundError();
  for (const guard of transition.guards) {
    if (!(await GUARDS[guard](orderForGuard))) {
      throw new GuardFailedError(fromStatus, toStatus, guard);
    }
  }

  const $set = { status: toStatus };
  if (toStatus === "delivered") $set.deliveredAt = new Date();
  if (toStatus === "disputed") $set.disputedAt = new Date();
  if (toStatus === "released") $set.releasedAt = new Date();
  if (toStatus === "refunded") $set.refundedAt = new Date();
  if (options.disputeResolvedBy) $set.disputeResolvedBy = options.disputeResolvedBy;
  if (options.disputeResolution) $set.disputeResolution = options.disputeResolution;
  if (options.stripePaymentIntentId) $set.stripePaymentIntentId = options.stripePaymentIntentId;

  const updated = await Order.findOneAndUpdate(
    { _id: orderId, status: fromStatus },
    { $set },
    { new: true },
  );

  if (!updated) {
    await EscrowEvent.create({
      orderId, fromStatus, toStatus,
      triggeredBy: actorId, triggerType,
      reason: "Race lost or status already changed",
      metadata: { lostRace: true },
    });
    return null;
  }

  await EscrowEvent.create({
    orderId, fromStatus, toStatus,
    triggeredBy: actorId, triggerType: triggerType || "system",
    reason: options.reason || "",
    metadata: options.metadata || {},
  });

  return updated;
}

// ── Domain methods ──

export async function checkout(listingId, quantity, buyerId) {
  const listing = await Listing.findById(listingId);
  if (!listing || listing.status !== "active") throw new ListingNotActiveError();
  if (String(listing.sellerId) === String(buyerId)) throw new OwnListingError();
  if (listing.quantity < quantity) throw new InsufficientQuantityError();

  const seller = await User.findById(listing.sellerId).select("sellerTier");
  const sellerTier = seller?.sellerTier || "unverified";
  const holdDurationMs = HOLD_DURATION_MS[sellerTier] || HOLD_DURATION_MS.unverified;
  const totalMinorUnits = listing.priceMinorUnits * quantity;

  const reserved = await Listing.findOneAndUpdate(
    { _id: listingId, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { new: true },
  );
  if (!reserved) throw new InsufficientQuantityError();

  let paymentIntent;
  try {
    paymentIntent = await stripeService.createPaymentIntent(totalMinorUnits, "npr", {
      listingId: String(listing._id),
      buyerId: String(buyerId),
    });
  } catch (err) {
    await Listing.findOneAndUpdate({ _id: listingId }, { $inc: { quantity: quantity } });
    throw err;
  }

  const order = await Order.create({
    buyerId,
    sellerId: listing.sellerId,
    listingId: listing._id,
    listingSnapshot: {
      title: listing.title,
      priceMinorUnits: listing.priceMinorUnits,
      currency: listing.currency || "NPR",
    },
    quantity,
    unitPriceMinorUnits: listing.priceMinorUnits,
    totalMinorUnits,
    stripePaymentIntentId: paymentIntent.id,
    holdDurationMs,
    status: "created",
  });

  await EscrowEvent.create({
    orderId: order._id,
    fromStatus: null,
    toStatus: "created",
    triggeredBy: buyerId,
    triggerType: "buyer",
    reason: "Order created via checkout",
    metadata: { paymentIntentId: paymentIntent.id },
  });

  return { order, clientSecret: paymentIntent.client_secret };
}

export async function markShipped(orderId, sellerId) {
  const result = await transitionOrder(orderId, "payment_held", "shipped", "seller", sellerId);
  if (result) sendOrderShippedNotification(result.buyerId, result._id);
  return result;
}

export async function confirmDelivery(orderId, buyerId) {
  const result = await transitionOrder(orderId, "shipped", "delivered", "buyer", buyerId);
  if (result) sendOrderDeliveredNotification(result.sellerId, result._id);
  return result;
}

export async function openDispute(orderId, buyerId) {
  const order = await Order.findById(orderId);
  if (!order) throw new OrderNotFoundError();
  if (order.status !== "payment_held" && order.status !== "shipped") {
    throw new TransitionNotAllowedError(order.status, "disputed", "Can only dispute from payment_held or shipped");
  }
  const result = await transitionOrder(orderId, order.status, "disputed", "buyer", buyerId);
  if (result) sendOrderDisputedNotification(result.sellerId, result._id);
  return result;
}

export async function resolveDispute(orderId, adminId, resolution) {
  const result = await transitionOrder(orderId, "disputed", resolution, "admin", adminId, {
    disputeResolvedBy: adminId,
    disputeResolution: resolution,
  });
  if (result) {
    if (resolution === "released") {
      await handleReleaseActions(result);
      sendOrderReleasedNotification(result.buyerId, result._id);
      sendOrderReleasedNotification(result.sellerId, result._id);
    } else {
      await handleRefundActions(result);
      sendOrderRefundedNotification(result.buyerId, result._id);
      sendOrderRefundedNotification(result.sellerId, result._id);
    }
  }
  return result;
}

export async function adminRelease(orderId, adminId) {
  const result = await transitionOrder(orderId, "delivered", "released", "admin", adminId);
  if (result) {
    await handleReleaseActions(result);
    sendOrderReleasedNotification(result.buyerId, result._id);
    sendOrderReleasedNotification(result.sellerId, result._id);
  }
  return result;
}

export async function tryAutoRelease(order) {
  if (order.status !== "delivered" || !order.deliveredAt) return null;
  if (Date.now() - order.deliveredAt.getTime() < order.holdDurationMs) return null;
  const result = await transitionOrder(order._id, "delivered", "released", "system", null);
  if (result) {
    await handleReleaseActions(result);
    sendOrderReleasedNotification(result.buyerId, result._id);
    sendOrderReleasedNotification(result.sellerId, result._id);
  }
  return result;
}

export async function handlePaymentSucceeded(paymentIntentId, stripeEventId) {
  const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order || order.status !== "created") return order;
  const result = await transitionOrder(order._id, "created", "payment_held", "webhook", null, {
    reason: "Payment intent succeeded",
    metadata: { stripeEventId },
  });
  if (result) sendPaymentReceivedNotification(result.sellerId, result._id);
  return result;
}

async function handleReleaseActions(order) {
  if (order.stripePaymentIntentId) {
    try { await stripeService.capturePaymentIntent(order.stripePaymentIntentId); }
    catch (err) { console.error("Capture failed:", err.message); }
  }
}

async function handleRefundActions(order) {
  if (order.stripePaymentIntentId) {
    try { await stripeService.cancelPaymentIntent(order.stripePaymentIntentId); }
    catch (err) { console.error("Cancel failed:", err.message); }
  }
}

// ── Query helpers with lazy auto-release ──

export async function getOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order) return null;
  if (order.status === "delivered") {
    const released = await tryAutoRelease(order);
    if (released) return released;
  }
  return order;
}

export async function listOrders(userId, role) {
  const filter = role === "seller" ? { sellerId: userId } : { buyerId: userId };
  const orders = await Order.find(filter).sort({ createdAt: -1 });
  const results = [];
  for (const order of orders) {
    if (order.status === "delivered") {
      const released = await tryAutoRelease(order);
      results.push(released || order);
    } else {
      results.push(order);
    }
  }
  return results;
}

export async function getOrderEvents(orderId) {
  return EscrowEvent.find({ orderId }).sort({ createdAt: 1 });
}
