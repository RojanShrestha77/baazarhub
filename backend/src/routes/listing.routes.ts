import fs from "node:fs";
import { Request, Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession, requireRole, requireOwnership } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import {
  listingReadLimiter,
  listingWriteLimiter,
  searchLimiter,
  listingImageUploadLimiter,
} from "../middlewares/rate-limiters";
import { validateBody, validateQuery, validateObjectIdParam } from "../middlewares/validate";
import {
  listingCreateSchema,
  listingUpdateSchema,
  searchQuerySchema,
  ListingCreateDto,
  ListingUpdateDto,
  SearchQueryDto,
} from "../validators/listing.schema";
import {
  createListing,
  updateListing,
  withdrawListing,
  searchListings,
  TierLimitError,
  InvalidTransitionError,
  InvalidCategoryError,
} from "../services/listing.service";
import { serializeListing } from "../services/listing-serializer";
import { ListingModel, IListing } from "../models/listing.model";
import {
  receiveListingImages,
  validateAndStoreListingImages,
  resolveListingImagePath,
} from "../middlewares/listing-image-upload";

const router = createAuthzRouter();

function handleServiceError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof TierLimitError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof InvalidTransitionError || err instanceof InvalidCategoryError) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

async function resolveListingOwner(req: Request) {
  const listing = await ListingModel.findById(req.params.id);
  return listing?.sellerId ?? null;
}

// ── Create (sellers only; tier limit enforced in the service) ──
router.post("/", [requireSession, requireRole("seller")], requireCsrfToken, listingWriteLimiter, validateBody(listingCreateSchema), async (req, res, next) => {
  try {
    const listing = await createListing(req.user!, req.validatedBody as ListingCreateDto);
    return res.status(201).json(serializeListing(listing));
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

// ── Search (registered BEFORE /:id so "/search" isn't captured as :id) ──
router.get("/search", [requireSession], searchLimiter, validateQuery(searchQuerySchema), async (req, res, next) => {
  try {
    const result = await searchListings(req.validatedQuery as SearchQueryDto);
    return res.status(200).json({
      listings: result.listings.map(serializeListing),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
});

// Draft listings are visible only to their owner; everything else is
// publicly viewable. 404 not 403 — same existence-hiding reasoning.
function isVisibleTo(listing: IListing, userId: unknown): boolean {
  return listing.status !== "draft" || String(listing.sellerId) === String(userId);
}

// ── Read ──
router.get("/:id", [requireSession], listingReadLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const listing = await ListingModel.findById(req.params.id);
    if (!listing || !isVisibleTo(listing, req.user!._id)) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json(serializeListing(listing));
  } catch (err) {
    next(err);
  }
});

// ── Update (owner only) ──
router.patch(
  "/:id",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingWriteLimiter,
  validateObjectIdParam("id"),
  validateBody(listingUpdateSchema),
  async (req, res, next) => {
    try {
      const listing = await ListingModel.findById(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Not found" });
      }
      const updated = await updateListing(listing, req.validatedBody as ListingUpdateDto);
      return res.status(200).json(serializeListing(updated));
    } catch (err) {
      handleServiceError(err, res, next);
    }
  },
);

// ── Withdraw (owner only, soft delete) ──
router.delete("/:id", [requireSession, requireOwnership(resolveListingOwner)], requireCsrfToken, listingWriteLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const listing = await ListingModel.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ error: "Not found" });
    }
    const withdrawn = await withdrawListing(listing);
    return res.status(200).json(serializeListing(withdrawn));
  } catch (err) {
    handleServiceError(err, res, next);
  }
});

async function attachListing(req: Request, _res: Response, next: NextFunction) {
  try {
    req.listing = await ListingModel.findById(req.params.id);
    next();
  } catch (err) {
    next(err);
  }
}

// ── Add images (owner only) ──
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
      req.listing!.images.push(...req.uploadedImageFilenames!);
      await req.listing!.save();
      return res.status(200).json(serializeListing(req.listing!));
    } catch (err) {
      next(err);
    }
  },
);

// ── Serve an image ──
router.get("/:id/images/:filename", [requireSession], listingReadLimiter, validateObjectIdParam("id"), async (req, res, next) => {
  try {
    const listing = await ListingModel.findById(req.params.id);
    // The filename must belong to this listing; same draft-visibility rule.
    if (!listing || !listing.images.includes(req.params.filename) || !isVisibleTo(listing, req.user!._id)) {
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
});

export default router;
