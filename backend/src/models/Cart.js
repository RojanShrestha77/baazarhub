import mongoose from "mongoose";

const { Schema } = mongoose;

// No price field on cart items, structurally — same "can't leak/tamper
// what isn't stored" reasoning as Phase 2's Profile model excluding
// role/tier. Price is ALWAYS re-resolved live from the current Listing
// document at read and checkout time (see services/cartService.js) —
// never cached here, never accepted from the client.
const cartItemSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

export const Cart = mongoose.model("Cart", cartSchema);
