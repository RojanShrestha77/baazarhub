import fs from "node:fs";

import { createAuthzRouter } from "../lib/authzRouter.js";
import { requireSession, requireRole, requireOwnership } from "../middleware/authz.js";
import { requireCsrfToken } from "../lib/csrf.js";
import {
  listingReadLimiter,
  listingWriteLimiter,
  searchLimiter,
  listingImageUploadLimiter,
} from "../middleware/rateLimiters.js";
import { validateBody, validateQuery, validateObjectIdParam } from "../middleware/validate.js";
import { listingCreateSchema, listingUpdateSchema, searchQuerySchema } from "../validators/listing.schemas.js";
import {
  createListing,
  updateListing,
  withdrawListing,
  searchListings,
  TierLimitError,
  InvalidTransitionError,
  InvalidCategoryError,
} from "../services/listingService.js";
import { serializeListing } from "../services/listingSerializer.js";
import { Listing } from "../models/Listing.js";
import {
  receiveListingImages,
  validateAndStoreListingImages,
  resolveListingImagePath,
} from "../middleware/listingImageUpload.js";

const router = createAuthzRouter();

function handleServiceError(err, res, next) {
  if (err instanceof TierLimitError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof InvalidTransitionError || err instanceof InvalidCategoryError) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

async function resolveListingOwner(req) {
  const listing = await Listing.findById(req.params.id);
  return listing?.sellerId ?? null;
}

// ── Create ─────────────────────────────────────────────────────────────
// Only sellers can create listings — buyers/admins get 403. Tier limit is
// enforced inside listingService.createListing, not here, so it can't be
// bypassed by a future second call site.
router.post(
  "/",
  [requireSession, requireRole("seller")],
  requireCsrfToken,
  listingWriteLimiter,
  validateBody(listingCreateSchema),
  async (req, res, next) => {
    try {
      const listing = await createListing(req.user, req.validatedBody);
      return res.status(201).json(serializeListing(listing));
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// ── Search (registered BEFORE /:id — otherwise "/search" would be
// captured as the :id param, since Express matches routes in
// registration order) ────────────────────────────────────────────────
router.get(
  "/search",
  [requireSession],
  searchLimiter,
  validateQuery(searchQuerySchema),
  async (req, res, next) => {
    try {
      const result = await searchListings(req.validatedQuery);
      return res.status(200).json({
        listings: result.listings.map(serializeListing),
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Draft listings are pre-publication and visible only to their owner —
// everything else (active/sold/withdrawn) is publicly viewable, same as
// profiles. Found by attacking the endpoint directly during the Phase 3
// self-attack pass: GET /:id had no status check at all, so any
// authenticated user could read another seller's unpublished title/
// description/price by guessing or being handed the id. 404, not 403 —
// same existence-hiding reasoning as everywhere else in this codebase.
function isVisibleTo(listing, userId) {
  return listing.status !== "draft" || String(listing.sellerId) === String(userId);
}

// ── Read (public-to-any-authenticated-user for non-draft listings) ──────
router.get(
  "/:id",
  [requireSession],
  listingReadLimiter,
  validateObjectIdParam("id"),
  async (req, res, next) => {
    try {
      const listing = await Listing.findById(req.params.id);
      if (!listing || !isVisibleTo(listing, req.user._id)) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(200).json(serializeListing(listing));
    } catch (err) {
      next(err);
    }
  },
);

// ── Update (owner only — field edits and/or a status transition) ────────
router.patch(
  "/:id",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingWriteLimiter,
  validateObjectIdParam("id"),
  validateBody(listingUpdateSchema),
  async (req, res, next) => {
    try {
      const listing = await Listing.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Not found" });
      }
      const updated = await updateListing(listing, req.validatedBody);
      return res.status(200).json(serializeListing(updated));
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// ── Withdraw (owner only, soft delete via status transition) ────────────
router.delete(
  "/:id",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingWriteLimiter,
  validateObjectIdParam("id"),
  async (req, res, next) => {
    try {
      const listing = await Listing.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Not found" });
      }
      const withdrawn = await withdrawListing(listing);
      return res.status(200).json(serializeListing(withdrawn));
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// req.listing is guaranteed non-null here: requireOwnership already
// resolved and confirmed the listing exists and is owned by req.user
// before this middleware ever runs.
async function attachListing(req, res, next) {
  try {
    req.listing = await Listing.findById(req.params.id);
    next();
  } catch (err) {
    next(err);
  }
}

// ── Add images (owner only) ──────────────────────────────────────────
router.post(
  "/:id/images",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingImageUploadLimiter,
  validateObjectIdParam("id"),
  attachListing,
  receiveListingImages,
  validateAndStoreListingImages,
  async (req, res, next) => {
    try {
      req.listing.images.push(...req.uploadedImageFilenames);
      await req.listing.save();
      return res.status(200).json(serializeListing(req.listing));
    } catch (err) {
      next(err);
    }
  },
);

// ── Serve an image (public-to-any-authenticated-user, same as the
// listing itself) ────────────────────────────────────────────────────
router.get(
  "/:id/images/:filename",
  [requireSession],
  listingReadLimiter,
  validateObjectIdParam("id"),
  async (req, res, next) => {
    try {
      const listing = await Listing.findById(req.params.id);
      // The filename must actually belong to this listing — never trust
      // a filename alone as proof it's servable, even though the
      // generated-filename discipline already makes traversal
      // structurally impossible. Same draft-visibility rule as GET /:id.
      if (
        !listing ||
        !listing.images.includes(req.params.filename) ||
        !isVisibleTo(listing, req.user._id)
      ) {
        return res.status(404).json({ error: "Not found" });
      }
      const filePath = resolveListingImagePath(req.params.filename);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.sendFile(filePath, (err) => {
        if (err) next(err);
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
