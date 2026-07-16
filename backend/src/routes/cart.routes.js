import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireSession } from "../middleware/authz.js";
import { requireCsrfToken } from "../lib/csrf.js";
import { cartReadLimiter, cartWriteLimiter } from "../middleware/rateLimiters.js";
import { validateBody, validateObjectIdParam } from "../middleware/validate.js";
import { addCartItemSchema, updateCartItemSchema } from "../validators/cart.schemas.js";
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
} from "../services/cartService.js";

const router = createAuthzRouter();

function handleCartError(err, res, next) {
  if (err instanceof ListingNotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (
    err instanceof OwnListingError ||
    err instanceof ListingNotAvailableError ||
    err instanceof InvalidQuantityError
  ) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

// ── Read (always the requester's own cart — no :id, nothing to own-check) ─
router.get("/", [requireSession], cartReadLimiter, async (req, res, next) => {
  try {
    const cart = await getCart(req.user._id);
    return res.status(200).json(cart);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/items",
  [requireSession],
  requireCsrfToken,
  cartWriteLimiter,
  validateBody(addCartItemSchema),
  async (req, res, next) => {
    try {
      await addItem(req.user._id, req.validatedBody.listingId, req.validatedBody.quantity);
      const cart = await getCart(req.user._id);
      return res.status(200).json(cart);
    } catch (err) {
      handleCartError(err, res, next);
    }
  },
);

router.patch(
  "/items/:listingId",
  [requireSession],
  requireCsrfToken,
  cartWriteLimiter,
  validateObjectIdParam("listingId"),
  validateBody(updateCartItemSchema),
  async (req, res, next) => {
    try {
      await updateItemQuantity(req.user._id, req.params.listingId, req.validatedBody.quantity);
      const cart = await getCart(req.user._id);
      return res.status(200).json(cart);
    } catch (err) {
      handleCartError(err, res, next);
    }
  },
);

router.delete(
  "/items/:listingId",
  [requireSession],
  requireCsrfToken,
  cartWriteLimiter,
  validateObjectIdParam("listingId"),
  async (req, res, next) => {
    try {
      await removeItem(req.user._id, req.params.listingId);
      const cart = await getCart(req.user._id);
      return res.status(200).json(cart);
    } catch (err) {
      next(err);
    }
  },
);

// Validation-only (Phase 3 decision, docs/security-decisions.md): re-
// resolves price/availability/quantity and returns a priced summary. No
// persistence, no Listing mutation — there is no Order model yet.
router.post("/checkout", [requireSession], requireCsrfToken, cartWriteLimiter, async (req, res, next) => {
  try {
    const preview = await checkoutPreview(req.user._id);
    return res.status(preview.ok ? 200 : 409).json(preview);
  } catch (err) {
    next(err);
  }
});

export default router;
