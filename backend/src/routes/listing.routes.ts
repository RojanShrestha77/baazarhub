import { Request, Response, NextFunction } from "express";
import { createAuthzRouter } from "../lib/authzRouter";
import { requireSession, requireRole, requireOwnership } from "../middlewares/authz";
import { requireCsrfToken } from "../lib/csrf";
import { listingReadLimiter, listingWriteLimiter, searchLimiter, listingImageUploadLimiter } from "../middlewares/rate-limiters";
import { validateBody, validateQuery, validateObjectIdParam } from "../middlewares/validate";
import { listingCreateSchema, listingUpdateSchema, searchQuerySchema } from "../validators/listing.schema";
import { ListingModel } from "../models/listing.model";
import { receiveListingImages, validateAndStoreListingImages } from "../middlewares/listing-image-upload";
import { ListingController } from "../controllers/listing.controller";

const router = createAuthzRouter();
const listing = new ListingController();

// Ownership resolver + attach middleware stay at the route (wiring concern).
async function resolveListingOwner(req: Request) {
  const found = await ListingModel.findById(req.params.id);
  return found?.sellerId ?? null;
}

async function attachListing(req: Request, _res: Response, next: NextFunction) {
  try {
    req.listing = await ListingModel.findById(req.params.id);
    next();
  } catch (err) {
    next(err);
  }
}

router.post("/", [requireSession, requireRole("seller")], requireCsrfToken, listingWriteLimiter, validateBody(listingCreateSchema), listing.create);

// Search registered BEFORE /:id so "/search" isn't captured as :id.
router.get("/search", [requireSession], searchLimiter, validateQuery(searchQuerySchema), listing.search);

router.get("/:id", [requireSession], listingReadLimiter, validateObjectIdParam("id"), listing.read);

router.patch(
  "/:id",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingWriteLimiter,
  validateObjectIdParam("id"),
  validateBody(listingUpdateSchema),
  listing.update,
);

router.delete("/:id", [requireSession, requireOwnership(resolveListingOwner)], requireCsrfToken, listingWriteLimiter, validateObjectIdParam("id"), listing.withdraw);

router.post(
  "/:id/images",
  [requireSession, requireOwnership(resolveListingOwner)],
  requireCsrfToken,
  listingImageUploadLimiter,
  validateObjectIdParam("id"),
  attachListing,
  receiveListingImages,
  validateAndStoreListingImages,
  listing.addImages,
);

router.get("/:id/images/:filename", [requireSession], listingReadLimiter, validateObjectIdParam("id"), listing.serveImage);

export default router;
