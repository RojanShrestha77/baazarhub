import mongoose from "mongoose";

const { Schema } = mongoose;

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"];

const documentSchema = new Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const verificationRequestSchema = new Schema(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documents: { type: [documentSchema], default: [], validate: [arr => arr.length > 0, "At least one document required"] },
    status: { type: String, enum: VERIFICATION_STATUSES, default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

verificationRequestSchema.index({ sellerId: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

export const VerificationRequest = mongoose.model("VerificationRequest", verificationRequestSchema);
