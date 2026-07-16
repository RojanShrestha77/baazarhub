import { Listing } from "../models/Listing.js";
import { Category } from "../models/Category.js";

// Tier limits (Phase 3 decision) — enforced HERE, not just at the route,
// so a future second call site (bulk import, admin tooling, whatever)
// can't accidentally skip it. A client-side check is not a control.
const LISTING_LIMIT_BY_TIER = {
  unverified: 3,
  verified: 20,
  trusted: Infinity,
};

// Explicit transition table — anything not listed is rejected. Sold and
// withdrawn are terminal; there is no path back to draft/active from
// either (a re-list is a new listing, not a status flip, so a sold item's
// history can't be quietly rewritten).
const ALLOWED_TRANSITIONS = {
  draft: ["active", "withdrawn"],
  active: ["sold", "withdrawn"],
  sold: [],
  withdrawn: [],
};

export class TierLimitError extends Error {
  constructor(limit) {
    super(`Listing limit reached for your seller tier (max ${limit})`);
    this.code = "TIER_LIMIT";
  }
}

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Cannot transition a listing from "${from}" to "${to}"`);
    this.code = "INVALID_TRANSITION";
  }
}

export class InvalidCategoryError extends Error {
  constructor() {
    super("Unknown category");
    this.code = "INVALID_CATEGORY";
  }
}

async function assertValidCategory(categoryId) {
  const exists = await Category.exists({ _id: categoryId });
  if (!exists) {
    throw new InvalidCategoryError();
  }
}

export async function createListing(seller, fields) {
  const limit = LISTING_LIMIT_BY_TIER[seller.sellerTier] ?? LISTING_LIMIT_BY_TIER.unverified;
  // Withdrawn listings don't count against the cap — withdrawing frees the
  // slot back up.
  const activeCount = await Listing.countDocuments({
    sellerId: seller._id,
    status: { $ne: "withdrawn" },
  });
  if (activeCount >= limit) {
    throw new TierLimitError(limit);
  }

  await assertValidCategory(fields.category);

  // Explicit field list — never a req.body/req.validatedBody spread, same
  // discipline as every write path since Phase 1. status/sellerId are
  // never client-settable: status always starts "draft", sellerId is
  // always the authenticated requester.
  return Listing.create({
    sellerId: seller._id,
    title: fields.title,
    description: fields.description,
    priceMinorUnits: fields.priceMinorUnits,
    category: fields.category,
    quantity: fields.quantity,
  });
}

export async function updateListing(listing, fields) {
  if (fields.category !== undefined) {
    await assertValidCategory(fields.category);
  }

  if (fields.status !== undefined && fields.status !== listing.status) {
    const allowed = ALLOWED_TRANSITIONS[listing.status] ?? [];
    if (!allowed.includes(fields.status)) {
      throw new InvalidTransitionError(listing.status, fields.status);
    }
    listing.status = fields.status;
  }

  if (fields.title !== undefined) listing.title = fields.title;
  if (fields.description !== undefined) listing.description = fields.description;
  if (fields.priceMinorUnits !== undefined) listing.priceMinorUnits = fields.priceMinorUnits;
  if (fields.category !== undefined) listing.category = fields.category;
  if (fields.quantity !== undefined) listing.quantity = fields.quantity;

  await listing.save();
  return listing;
}

const MAX_PAGE_SIZE = 50;

// Phase 3, Slice 2. `filters` is always req.validatedQuery — already
// type-checked by validators/listing.schemas.js's searchQuerySchema, so
// every field here is a plain string/number, never an object. The filter
// object below is built field-by-field from those validated values —
// never `{ ...filters }` spread into the Mongo query — same discipline as
// every write path in this codebase since Phase 1.
//
// Free-text search uses Mongo's $text operator against the text index on
// title+description (models/Listing.js), NOT a RegExp built from user
// input. This isn't "the regex is sanitized," it's "there is no regex" —
// $text tokenizes and stems the search string, it never compiles it as a
// pattern, which structurally closes catastrophic-backtracking ReDoS for
// this field. See docs/security-decisions.md and
// tests/search/injection.test.js for the payload that proves this.
export async function searchListings(filters) {
  const filter = { status: "active" };

  if (filters.q) {
    filter.$text = { $search: filters.q };
  }

  if (filters.category) {
    const categoryFilter = /^[0-9a-fA-F]{24}$/.test(filters.category)
      ? { _id: filters.category }
      : { slug: filters.category };
    const category = await Category.findOne(categoryFilter);
    if (!category) {
      // Unknown category slug/id -> no results, not an error. Matches the
      // "existence isn't leaked" reasoning elsewhere: a search miss and a
      // search-for-nonexistent-category both just come back empty.
      return { listings: [], total: 0, page: filters.page, limit: filters.limit };
    }
    filter.category = category._id;
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.priceMinorUnits = {};
    if (filters.minPrice !== undefined) filter.priceMinorUnits.$gte = filters.minPrice;
    if (filters.maxPrice !== undefined) filter.priceMinorUnits.$lte = filters.maxPrice;
  }

  const limit = Math.min(filters.limit, MAX_PAGE_SIZE);
  const page = Math.max(filters.page, 1);
  const skip = (page - 1) * limit;

  const sort = filters.q ? { score: { $meta: "textScore" } } : { createdAt: -1 };
  const projection = filters.q ? { score: { $meta: "textScore" } } : undefined;

  const [listings, total] = await Promise.all([
    Listing.find(filter, projection).sort(sort).skip(skip).limit(limit),
    Listing.countDocuments(filter),
  ]);

  return { listings, total, page, limit };
}

// Soft delete — withdraws rather than hard-deleting, keeping the record
// (and its audit trail) the way Phase 2 established for privilege changes.
export async function withdrawListing(listing) {
  if (listing.status === "withdrawn") {
    return listing;
  }
  const allowed = ALLOWED_TRANSITIONS[listing.status] ?? [];
  if (!allowed.includes("withdrawn")) {
    throw new InvalidTransitionError(listing.status, "withdrawn");
  }
  listing.status = "withdrawn";
  await listing.save();
  return listing;
}
