import mongoose from "mongoose";

const { Schema } = mongoose;

export const ORDER_STATUSES = [
  "created",
  "payment_held",
  "shipped",
  "delivered",
  "released",
  "disputed",
  "refunded",
];

const listingSnapshotSchema = new Schema({
  title: { type: String, required: true },
  priceMinorUnits: { type: Number, required: true },
  currency: { type: String, default: "NPR" },
}, { _id: false });

const orderSchema = new Schema(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    listingId: { type: Schema.Types.ObjectId, ref: "Listing", required: true },

    listingSnapshot: { type: listingSnapshotSchema, required: true },

    quantity: { type: Number, required: true, min: 1 },
    totalMinorUnits: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "created",
    },

    stripePaymentIntentId: { type: String },

    holdDurationMs: { type: Number, required: true },

    deliveredAt: { type: Date },
    disputedAt: { type: Date },
    releasedAt: { type: Date },
    refundedAt: { type: Date },

    disputeResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    disputeResolution: { type: String, enum: ["released", "refunded"] },
  },
  { timestamps: true },
);

orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

export const Order = mongoose.model("Order", orderSchema);
