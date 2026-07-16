import { Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { cartReadLimiter, cartWriteLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateObjectIdParam } from "../middlewares/validate";
import { addCartItemSchema, updateCartItemSchema, AddCartItemDto, UpdateCartItemDto } from "../validators/cart.schema";
import {
  addItem,
  updateItemQuantity,
  removeItem,
  getCart,
  checkoutPreview,
  ListingNotFoundError,
  OwnListingError,
  ListingNotAvailableError,
  InvalidQuantityError,
} from "../services/cart.service";

const router = createAuthzRouter();

function handleCartError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof ListingNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof OwnListingError || err instanceof ListingNotAvailableError || err instanceof InvalidQuantityError) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

// ── Read (always the requester's own cart) ──
router.get("/", [requireSession], cartReadLimiter, async (req, res, next) => {
  try {
    const cart = await getCart(req.user!._id);
    return res.status(200).json(cart);
  } catch (err) {
    next(err);
  }
});

router.post("/items", [requireSession], requireCsrfToken, cartWriteLimiter, validateBody(addCartItemSchema), async (req, res, next) => {
  try {
    const body = req.validatedBody as AddCartItemDto;
    await addItem(req.user!._id, body.listingId, body.quantity);
    const cart = await getCart(req.user!._id);
    return res.status(200).json(cart);
  } catch (err) {
    handleCartError(err, res, next);
  }
});

router.patch(
  "/items/:listingId",
  [requireSession],
  requireCsrfToken,
  cartWriteLimiter,
  validateObjectIdParam("listingId"),
  validateBody(updateCartItemSchema),
  async (req, res, next) => {
    try {
      const body = req.validatedBody as UpdateCartItemDto;
      await updateItemQuantity(req.user!._id, req.params.listingId, body.quantity);
      const cart = await getCart(req.user!._id);
      return res.status(200).json(cart);
    } catch (err) {
      handleCartError(err, res, next);
    }
  },
);

router.delete("/items/:listingId", [requireSession], requireCsrfToken, cartWriteLimiter, validateObjectIdParam("listingId"), async (req, res, next) => {
  try {
    await removeItem(req.user!._id, req.params.listingId);
    const cart = await getCart(req.user!._id);
    return res.status(200).json(cart);
  } catch (err) {
    next(err);
  }
});

// Validation-only preview: re-resolves price/availability, persists nothing.
router.post("/checkout", [requireSession], requireCsrfToken, cartWriteLimiter, async (req, res, next) => {
  try {
    const preview = await checkoutPreview(req.user!._id);
    return res.status(preview.ok ? 200 : 409).json(preview);
  } catch (err) {
    next(err);
  }
});

export default router;
