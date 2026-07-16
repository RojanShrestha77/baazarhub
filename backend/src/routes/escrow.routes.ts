import { Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession, requireRole, requireMfaVerified } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { escrowReadLimiter, escrowWriteLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { checkoutSchema, resolveDisputeSchema, CheckoutDto, ResolveDisputeDto } from "../validators/escrow.schema";
import {
  checkout,
  markShipped,
  confirmDelivery,
  openDispute,
  resolveDispute as resolveDisputeService,
  adminRelease,
  getOrder,
  listOrders,
  getOrderEvents,
  OrderNotFoundError,
  TransitionNotAllowedError,
  GuardFailedError,
  InsufficientQuantityError,
  OwnListingError,
  ListingNotActiveError,
} from "../services/escrow.service";
import { OrderModel } from "../models/order.model";
import { logEvent } from "../services/audit.service";
import {
  sendPaymentReceivedNotification,
  sendOrderShippedNotification,
  sendOrderDeliveredNotification,
  sendOrderDisputedNotification,
  sendOrderReleasedNotification,
  sendOrderRefundedNotification,
} from "../services/mail.service";

const router = createAuthzRouter();

function handleEscrowError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof OrderNotFoundError) return res.status(404).json({ error: err.message });
  if (err instanceof TransitionNotAllowedError) return res.status(409).json({ error: err.message });
  if (err instanceof GuardFailedError) return res.status(409).json({ error: err.message });
  if (err instanceof InsufficientQuantityError) return res.status(409).json({ error: err.message });
  if (err instanceof OwnListingError) return res.status(400).json({ error: err.message });
  if (err instanceof ListingNotActiveError) return res.status(400).json({ error: err.message });
  next(err);
}

// ── Checkout ──
router.post("/checkout", [requireSession], requireCsrfToken, escrowWriteLimiter, validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const body = req.validatedBody as CheckoutDto;
    const result = await checkout(body.listingId, body.quantity, req.user!._id);
    logEvent({ actor: req.user!._id, action: "escrow_checkout", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: String(result.order._id) } }).catch(() => {});
    sendPaymentReceivedNotification(req.user!._id, String(result.order._id));
    return res.status(201).json({ orderId: result.order._id, clientSecret: result.clientSecret, totalMinorUnits: result.order.totalMinorUnits });
  } catch (err) {
    handleEscrowError(err, res, next);
  }
});

// ── List orders ──
router.get("/orders", [requireSession], escrowReadLimiter, async (req, res, next) => {
  try {
    const role = req.query.role === "seller" ? "seller" : "buyer";
    const orders = await listOrders(req.user!._id, role);
    return res.status(200).json(orders);
  } catch (err) {
    next(err);
  }
});

// ── Get single order (lazy auto-release) ──
router.get("/orders/:orderId", [requireSession], escrowReadLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    const isBuyer = String(order.buyerId) === String(req.user!._id);
    const isSeller = String(order.sellerId) === String(req.user!._id);
    const isAdmin = req.user!.role === "admin";
    if (!isBuyer && !isSeller && !isAdmin) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(order);
  } catch (err) {
    next(err);
  }
});

// ── Order audit trail ──
router.get("/orders/:orderId/events", [requireSession], escrowReadLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    const isBuyer = String(order.buyerId) === String(req.user!._id);
    const isSeller = String(order.sellerId) === String(req.user!._id);
    const isAdmin = req.user!.role === "admin";
    if (!isBuyer && !isSeller && !isAdmin) return res.status(404).json({ error: "Not found" });
    const events = await getOrderEvents(req.params.orderId);
    return res.status(200).json(events);
  } catch (err) {
    next(err);
  }
});

// ── Seller: mark shipped ──
router.post("/orders/:orderId/ship", [requireSession, requireRole("seller")], requireCsrfToken, escrowWriteLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (String(order.sellerId) !== String(req.user!._id)) return res.status(404).json({ error: "Not found" });
    const updated = await markShipped(req.params.orderId, req.user!._id);
    if (!updated) return res.status(409).json({ error: "Transition failed — state changed" });
    logEvent({ actor: req.user!._id, action: "escrow_ship", outcome: "success", subject: order.buyerId, ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: req.params.orderId } }).catch(() => {});
    sendOrderShippedNotification(order.buyerId, req.params.orderId);
    return res.status(200).json(updated);
  } catch (err) {
    handleEscrowError(err, res, next);
  }
});

// ── Buyer: confirm delivery ──
router.post("/orders/:orderId/confirm-delivery", [requireSession], requireCsrfToken, escrowWriteLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (String(order.buyerId) !== String(req.user!._id)) return res.status(404).json({ error: "Not found" });
    const updated = await confirmDelivery(req.params.orderId, req.user!._id);
    if (!updated) return res.status(409).json({ error: "Transition failed — state changed" });
    logEvent({ actor: req.user!._id, action: "escrow_confirm_delivery", outcome: "success", subject: order.sellerId, ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: req.params.orderId } }).catch(() => {});
    sendOrderDeliveredNotification(order.sellerId, req.params.orderId);
    return res.status(200).json(updated);
  } catch (err) {
    handleEscrowError(err, res, next);
  }
});

// ── Buyer: open dispute ──
router.post("/orders/:orderId/dispute", [requireSession], requireCsrfToken, escrowWriteLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (String(order.buyerId) !== String(req.user!._id)) return res.status(404).json({ error: "Not found" });
    const updated = await openDispute(req.params.orderId, req.user!._id);
    if (!updated) return res.status(409).json({ error: "Transition failed — state changed" });
    logEvent({ actor: req.user!._id, action: "escrow_dispute", outcome: "success", subject: order.sellerId, ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: req.params.orderId } }).catch(() => {});
    sendOrderDisputedNotification(order.sellerId, req.params.orderId);
    return res.status(200).json(updated);
  } catch (err) {
    handleEscrowError(err, res, next);
  }
});

// ── Admin: resolve dispute ──
router.post(
  "/orders/:orderId/resolve-dispute",
  [requireSession, requireRole("admin"), requireMfaVerified],
  requireCsrfToken,
  escrowWriteLimiter,
  validateObjectIdParam("orderId"),
  validateBody(resolveDisputeSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody as ResolveDisputeDto;
      const order = await OrderModel.findById(req.params.orderId);
      if (!order) return res.status(404).json({ error: "Not found" });
      const updated = await resolveDisputeService(req.params.orderId, req.user!._id, body.resolution);
      if (!updated) return res.status(409).json({ error: "Transition failed — state changed" });
      logEvent({ actor: req.user!._id, action: "escrow_resolve_dispute", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: req.params.orderId, resolution: body.resolution } }).catch(() => {});
      // NOTE (faithful port): compares against "release" but the schema enum
      // is "released" — so this notification branch never fires the release
      // path. Preserved as-is; flagged as a finding to fix separately.
      if ((body.resolution as string) === "release") {
        sendOrderReleasedNotification(order.sellerId, req.params.orderId);
      } else {
        sendOrderRefundedNotification(order.buyerId, req.params.orderId);
      }
      return res.status(200).json(updated);
    } catch (err) {
      handleEscrowError(err, res, next);
    }
  },
);

// ── Admin: force release from delivered ──
router.post("/orders/:orderId/release", [requireSession, requireRole("admin"), requireMfaVerified], requireCsrfToken, escrowWriteLimiter, validateObjectIdParam("orderId"), async (req, res, next) => {
  try {
    const order = await OrderModel.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: "Not found" });
    const updated = await adminRelease(req.params.orderId, req.user!._id);
    if (!updated) return res.status(409).json({ error: "Transition failed — state changed" });
    logEvent({ actor: req.user!._id, action: "escrow_admin_release", outcome: "success", ip: req.ip, userAgent: req.get("user-agent"), metadata: { orderId: req.params.orderId } }).catch(() => {});
    sendOrderReleasedNotification(order.sellerId, req.params.orderId);
    return res.status(200).json(updated);
  } catch (err) {
    handleEscrowError(err, res, next);
  }
});

export default router;
