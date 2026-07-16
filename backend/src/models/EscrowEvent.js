import mongoose from "mongoose";

const { Schema } = mongoose;

const escrowEventSchema = new Schema({
  orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
  fromStatus: { type: String },
  toStatus: { type: String, required: true },
  triggeredBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  triggerType: {
    type: String,
    enum: ["buyer", "seller", "admin", "system", "webhook"],
    required: true,
  },
  reason: { type: String },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

escrowEventSchema.index({ orderId: 1, createdAt: 1 });

export const EscrowEvent = mongoose.model("EscrowEvent", escrowEventSchema);
