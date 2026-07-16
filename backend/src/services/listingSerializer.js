// Listings have no private fields — the whole point is that they're
// public marketplace data — but a serializer still keeps the response
// shape explicit and independent of whatever Mongoose's default
// toJSON/toObject output happens to include (__v, populate internals if a
// route ever populates category/seller).
export function serializeListing(listing) {
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
