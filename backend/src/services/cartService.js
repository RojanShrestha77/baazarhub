import { Cart } from "../models/Cart.js";
import { Listing } from "../models/Listing.js";

const MAX_QUANTITY_PER_ITEM = 10;

export class ListingNotFoundError extends Error {
  constructor() {
    super("Listing not found");
    this.code = "LISTING_NOT_FOUND";
  }
}

export class OwnListingError extends Error {
  constructor() {
    super("You cannot add your own listing to your cart");
    this.code = "OWN_LISTING";
  }
}

export class ListingNotAvailableError extends Error {
  constructor() {
    super("This listing is not currently available");
    this.code = "NOT_AVAILABLE";
  }
}

export class InvalidQuantityError extends Error {
  constructor(max) {
    super(`Quantity must be a positive integer up to ${max}`);
    this.code = "INVALID_QUANTITY";
  }
}

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }
  return cart;
}

// Shared validation for both add and update — a listing must exist, not
// be the requester's own, be active, and the requested quantity must fit
// within both the hard per-line cap and the listing's actual available
// stock. Re-run in full on every call, never trusted from a prior check.
async function assertAddable(userId, listingId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidQuantityError(MAX_QUANTITY_PER_ITEM);
  }

  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new ListingNotFoundError();
  }
  if (String(listing.sellerId) === String(userId)) {
    throw new OwnListingError();
  }
  if (listing.status !== "active") {
    throw new ListingNotAvailableError();
  }

  const cap = Math.min(MAX_QUANTITY_PER_ITEM, listing.quantity);
  if (quantity > cap) {
    throw new InvalidQuantityError(cap);
  }

  return listing;
}

export async function addItem(userId, listingId, quantity) {
  await assertAddable(userId, listingId, quantity);

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => String(item.listingId) === String(listingId));
  if (existing) {
    existing.quantity = quantity;
  } else {
    cart.items.push({ listingId, quantity });
  }
  await cart.save();
  return cart;
}

export async function updateItemQuantity(userId, listingId, quantity) {
  await assertAddable(userId, listingId, quantity);

  const cart = await getOrCreateCart(userId);
  const existing = cart.items.find((item) => String(item.listingId) === String(listingId));
  if (!existing) {
    throw new ListingNotFoundError();
  }
  existing.quantity = quantity;
  await cart.save();
  return cart;
}

export async function removeItem(userId, listingId) {
  const cart = await getOrCreateCart(userId);
  cart.items = cart.items.filter((item) => String(item.listingId) !== String(listingId));
  await cart.save();
  return cart;
}

// Re-resolves EVERY item against the live Listing document — price,
// status, quantity — on every call. A cart holding a stale price/
// availability is a business-logic bug waiting to be exploited (Phase 3
// decision): nothing about a cart line is trusted from what was true when
// it was added.
async function resolveCartItems(cart) {
  const resolved = [];
  for (const item of cart.items) {
    const listing = await Listing.findById(item.listingId);
    if (!listing || listing.status !== "active") {
      resolved.push({
        listingId: item.listingId,
        quantity: item.quantity,
        available: false,
        reason: !listing ? "Listing no longer exists" : `Listing is ${listing.status}`,
      });
      continue;
    }

    const availableQuantity = Math.min(listing.quantity, item.quantity);
    const available = availableQuantity >= item.quantity;

    resolved.push({
      listingId: item.listingId,
      title: listing.title,
      quantity: item.quantity,
      unitPriceMinorUnits: listing.priceMinorUnits,
      lineTotalMinorUnits: listing.priceMinorUnits * item.quantity,
      available,
      reason: available ? undefined : `Only ${listing.quantity} left in stock`,
    });
  }
  return resolved;
}

export async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  const items = await resolveCartItems(cart);
  const totalMinorUnits = items
    .filter((item) => item.available)
    .reduce((sum, item) => sum + item.lineTotalMinorUnits, 0);
  return { items, totalMinorUnits };
}

// Validation-only for this phase (Phase 3 decision — see
// docs/security-decisions.md): re-resolves the same way getCart does and
// returns a priced summary, but persists nothing and mutates no Listing.
// There is no Order model yet; committing a purchase is Phase 4's
// decision to make.
export async function checkoutPreview(userId) {
  const { items, totalMinorUnits } = await getCart(userId);
  const unavailable = items.filter((item) => !item.available);
  return { ok: unavailable.length === 0, items, unavailable, totalMinorUnits };
}
