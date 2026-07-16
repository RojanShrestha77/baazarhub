import { IListing } from "../models/listing.model";

// Listings have no private fields, but an explicit serializer keeps the
// response shape independent of Mongoose's default toJSON (__v, populate
// internals).
export function serializeListing(listing: IListing) {
  return {
    id: listing._id,
    sellerId: listing.sellerId,
    title: listing.title,
    description: listing.description,
    priceMinorUnits: listing.priceMinorUnits,
    currency: listing.currency,
    category: listing.category,
    status: listing.status,
    quantity: listing.quantity,
    images: listing.images,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}
