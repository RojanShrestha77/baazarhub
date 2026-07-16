import mongoose from "mongoose";

const { Schema } = mongoose;

// Money is stored as an integer count of the currency's minor unit (paisa,
// 1/100 of a rupee) — never a float. Floating-point binary representation
// can't exactly represent most decimal fractions (the classic
// 0.1 + 0.2 !== 0.3), and that error compounds across price math (cart
// totals, discounts, tax) into real off-by-a-paisa discrepancies that are
// a correctness bug here and a business/accounting problem in production.
// Integer minor units make every price operation exact integer arithmetic.
// See docs/security-decisions.md.
const listingSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },

    priceMinorUnits: { type: Number, required: true, min: 0 },
    // Fixed for this phase — not user-settable, no multi-currency support
    // yet, so there's no conversion-rate surface to get wrong.
    currency: { type: String, default: "NPR", immutable: true },

    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },

    status: {
      type: String,
      enum: ["draft", "active", "sold", "withdrawn"],
      default: "draft",
    },

    // Total available units. Not decremented by anything in this phase —
    // Cart re-resolves against this at read/checkout time but doesn't
    // mutate it (no Order model yet, see docs/security-decisions.md).
    quantity: { type: Number, required: true, min: 1, default: 1 },

    // Server-generated filenames only (middleware/listingImageUpload.js) —
    // never derived from anything a client sends. Same discipline as
    // Profile.avatarPath (Phase 2).
    images: { type: [String], default: [] },
  },
  { timestamps: true },
);

listingSchema.index({ sellerId: 1 });
listingSchema.index({ category: 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ title: "text", description: "text" });

export const Listing = mongoose.model("Listing", listingSchema);
