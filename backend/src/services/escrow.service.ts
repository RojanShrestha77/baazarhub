import { Types } from "mongoose";
import { OrderModel, IOrder, OrderStatus } from "../models/order.model";
import { EscrowEventModel, EscrowTriggerType } from "../models/escrow-event.model";
import { ListingModel } from "../models/listing.model";
import { UserModel } from "../models/user.model";
import { SellerTier } from "../types/user.type";
import * as stripeService from "./stripe.service";
import {
  sendPaymentReceivedNotification,
  sendOrderShippedNotification,
  sendOrderDeliveredNotification,
  sendOrderDisputedNotification,
  sendOrderReleasedNotification,
  sendOrderRefundedNotification,
} from "./mail.service";

// ── State machine: data-driven transition table ──
interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  whoCanTrigger: EscrowTriggerType[];
  guards: string[];
}

const TRANSITIONS: TransitionRule[] = [
  { from: "created", to: "payment_held", whoCanTrigger: ["webhook"], guards: [] },
  { from: "payment_held", to: "shipped", whoCanTrigger: ["seller"], guards: [] },
  { from: "payment_held", to: "disputed", whoCanTrigger: ["buyer"], guards: ["dispute_window_open"] },
  { from: "shipped", to: "delivered", whoCanTrigger: ["buyer"], guards: [] },
  { from: "shipped", to: "disputed", whoCanTrigger: ["buyer"], guards: ["dispute_window_open"] },
  { from: "delivered", to: "released", whoCanTrigger: ["system", "admin"], guards: ["hold_expired"] },
  { from: "disputed", to: "refunded", whoCanTrigger: ["admin"], guards: [] },
  { from: "disputed", to: "released", whoCanTrigger: ["admin"], guards: [] },
];

const GUARDS: Record<string, (order: IOrder) => Promise<boolean>> = {
  dispute_window_open: async (order) => {
    const windowMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - order.createdAt.getTime() < windowMs;
  },
  hold_expired: async (order) => {
    if (!order.deliveredAt) return false;
    return Date.now() - order.deliveredAt.getTime() >= order.holdDurationMs;
  },
};

export const HOLD_DURATION_MS: Record<SellerTier, number> = {
  trusted: 3 * 24 * 60 * 60 * 1000,
  verified: 7 * 24 * 60 * 60 * 1000,
  unverified: 14 * 24 * 60 * 60 * 1000,
};

// ── Error classes ──
export class TransitionNotAllowedError extends Error {
  constructor(fromStatus: string, toStatus: string, reason: string) {
    super(`Transition from ${fromStatus} to ${toStatus} not allowed: ${reason}`);
    this.name = "TransitionNotAllowedError";
  }
}
export class GuardFailedError extends Error {
  constructor(fromStatus: string, toStatus: string, guard: string) {
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

type IdLike = Types.ObjectId | string;

interface TransitionOptions {
  reason?: string;
  metadata?: Record<string, unknown>;
  disputeResolvedBy?: IdLike;
  disputeResolution?: "released" | "refunded";
  stripePaymentIntentId?: string;
}

function lookupTransition(fromStatus: string, toStatus: string, triggerType: string): TransitionRule | undefined {
  return TRANSITIONS.find((t) => t.from === fromStatus && t.to === toStatus && t.whoCanTrigger.includes(triggerType as EscrowTriggerType));
}

// Core atomic transition: the status change is a single findOneAndUpdate
// keyed on {_id, status: fromStatus} so two concurrent transitions can't
// both win. Every attempt — legal, illegal, or lost race — writes an
// immutable EscrowEvent.
export async function transitionOrder(
  orderId: IdLike,
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
  triggerType: EscrowTriggerType,
  actorId: IdLike | null,
  options: TransitionOptions = {},
): Promise<IOrder | null> {
  const transition = lookupTransition(fromStatus, toStatus, triggerType);
  if (!transition) {
    const order = await OrderModel.findById(orderId).select("status");
    const currentStatus = order ? order.status : "unknown";
    await EscrowEventModel.create({
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

  const orderForGuard = await OrderModel.findById(orderId);
  if (!orderForGuard) throw new OrderNotFoundError();
  for (const guard of transition.guards) {
    if (!(await GUARDS[guard](orderForGuard))) {
      throw new GuardFailedError(fromStatus, toStatus, guard);
    }
  }

  const $set: Record<string, unknown> = { status: toStatus };
  if (toStatus === "delivered") $set.deliveredAt = new Date();
  if (toStatus === "disputed") $set.disputedAt = new Date();
  if (toStatus === "released") $set.releasedAt = new Date();
  if (toStatus === "refunded") $set.refundedAt = new Date();
  if (options.disputeResolvedBy) $set.disputeResolvedBy = options.disputeResolvedBy;
  if (options.disputeResolution) $set.disputeResolution = options.disputeResolution;
  if (options.stripePaymentIntentId) $set.stripePaymentIntentId = options.stripePaymentIntentId;

  const updated = await OrderModel.findOneAndUpdate({ _id: orderId, status: fromStatus }, { $set }, { new: true });

  if (!updated) {
    await EscrowEventModel.create({
      orderId,
      fromStatus,
      toStatus,
      triggeredBy: actorId,
      triggerType,
      reason: "Race lost or status already changed",
      metadata: { lostRace: true },
    });
    return null;
  }

  await EscrowEventModel.create({
    orderId,
    fromStatus,
    toStatus,
    triggeredBy: actorId,
    triggerType: triggerType || "system",
    reason: options.reason || "",
    metadata: options.metadata || {},
  });

  return updated;
}

// ── Domain methods ──
export async function checkout(listingId: IdLike, quantity: number, buyerId: IdLike) {
  const listing = await ListingModel.findById(listingId);
  if (!listing || listing.status !== "active") throw new ListingNotActiveError();
  if (String(listing.sellerId) === String(buyerId)) throw new OwnListingError();
  if (listing.quantity < quantity) throw new InsufficientQuantityError();

  const seller = await UserModel.findById(listing.sellerId).select("sellerTier");
  const sellerTier: SellerTier = seller?.sellerTier || "unverified";
  const holdDurationMs = HOLD_DURATION_MS[sellerTier] || HOLD_DURATION_MS.unverified;
  const totalMinorUnits = listing.priceMinorUnits * quantity;

  // Reserve stock atomically before creating the payment intent — the
  // conditional $inc can't oversell.
  const reserved = await ListingModel.findOneAndUpdate(
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
    // Roll back the stock reservation if the payment intent fails.
    await ListingModel.findOneAndUpdate({ _id: listingId }, { $inc: { quantity: quantity } });
    throw err;
  }

  const order = await OrderModel.create({
    buyerId,
    sellerId: listing.sellerId,
    listingId: listing._id,
    listingSnapshot: {
      title: listing.title,
      priceMinorUnits: listing.priceMinorUnits,
      currency: listing.currency || "NPR",
    },
    quantity,
    totalMinorUnits,
    stripePaymentIntentId: paymentIntent.id,
    holdDurationMs,
    status: "created",
  });

  await EscrowEventModel.create({
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

export async function markShipped(orderId: IdLike, sellerId: IdLike) {
  const result = await transitionOrder(orderId, "payment_held", "shipped", "seller", sellerId);
  if (result) sendOrderShippedNotification(result.buyerId, String(result._id));
  return result;
}

export async function confirmDelivery(orderId: IdLike, buyerId: IdLike) {
  const result = await transitionOrder(orderId, "shipped", "delivered", "buyer", buyerId);
  if (result) sendOrderDeliveredNotification(result.sellerId, String(result._id));
  return result;
}

export async function openDispute(orderId: IdLike, buyerId: IdLike) {
  const order = await OrderModel.findById(orderId);
  if (!order) throw new OrderNotFoundError();
  if (order.status !== "payment_held" && order.status !== "shipped") {
    throw new TransitionNotAllowedError(order.status, "disputed", "Can only dispute from payment_held or shipped");
  }
  const result = await transitionOrder(orderId, order.status, "disputed", "buyer", buyerId);
  if (result) sendOrderDisputedNotification(result.sellerId, String(result._id));
  return result;
}

export async function resolveDispute(orderId: IdLike, adminId: IdLike, resolution: "released" | "refunded") {
  const result = await transitionOrder(orderId, "disputed", resolution, "admin", adminId, {
    disputeResolvedBy: adminId,
    disputeResolution: resolution,
  });
  if (result) {
    if (resolution === "released") {
      await handleReleaseActions(result);
      sendOrderReleasedNotification(result.buyerId, String(result._id));
      sendOrderReleasedNotification(result.sellerId, String(result._id));
    } else {
      await handleRefundActions(result);
      sendOrderRefundedNotification(result.buyerId, String(result._id));
      sendOrderRefundedNotification(result.sellerId, String(result._id));
    }
  }
  return result;
}

export async function adminRelease(orderId: IdLike, adminId: IdLike) {
  const result = await transitionOrder(orderId, "delivered", "released", "admin", adminId);
  if (result) {
    await handleReleaseActions(result);
    sendOrderReleasedNotification(result.buyerId, String(result._id));
    sendOrderReleasedNotification(result.sellerId, String(result._id));
  }
  return result;
}

export async function tryAutoRelease(order: IOrder) {
  if (order.status !== "delivered" || !order.deliveredAt) return null;
  if (Date.now() - order.deliveredAt.getTime() < order.holdDurationMs) return null;
  const result = await transitionOrder(order._id, "delivered", "released", "system", null);
  if (result) {
    await handleReleaseActions(result);
    sendOrderReleasedNotification(result.buyerId, String(result._id));
    sendOrderReleasedNotification(result.sellerId, String(result._id));
  }
  return result;
}

export async function handlePaymentSucceeded(paymentIntentId: string, stripeEventId: string) {
  const order = await OrderModel.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!order || order.status !== "created") return order;
  const result = await transitionOrder(order._id, "created", "payment_held", "webhook", null, {
    reason: "Payment intent succeeded",
    metadata: { stripeEventId },
  });
  if (result) sendPaymentReceivedNotification(result.sellerId, String(result._id));
  return result;
}

async function handleReleaseActions(order: IOrder): Promise<void> {
  if (order.stripePaymentIntentId) {
    try {
      await stripeService.capturePaymentIntent(order.stripePaymentIntentId);
    } catch (err) {
      console.error("Capture failed:", (err as Error).message);
    }
  }
}

async function handleRefundActions(order: IOrder): Promise<void> {
  if (order.stripePaymentIntentId) {
    try {
      await stripeService.cancelPaymentIntent(order.stripePaymentIntentId);
    } catch (err) {
      console.error("Cancel failed:", (err as Error).message);
    }
  }
}

// ── Query helpers with lazy auto-release ──
export async function getOrder(orderId: IdLike): Promise<IOrder | null> {
  const order = await OrderModel.findById(orderId);
  if (!order) return null;
  if (order.status === "delivered") {
    const released = await tryAutoRelease(order);
    if (released) return released;
  }
  return order;
}

export async function listOrders(userId: IdLike, role: string): Promise<IOrder[]> {
  const filter = role === "seller" ? { sellerId: userId } : { buyerId: userId };
  const orders = await OrderModel.find(filter).sort({ createdAt: -1 });
  const results: IOrder[] = [];
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

export async function getOrderEvents(orderId: IdLike) {
  return EscrowEventModel.find({ orderId }).sort({ createdAt: 1 });
}
