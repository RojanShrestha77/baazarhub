import mongoose, { Schema, Document } from "mongoose";

export const VERIFICATION_STATUSES = ["pending", "approved", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export interface IVerificationDocument {
  filename: string;
  originalName: string;
  mime: string;
  size: number;
}

export interface IVerificationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  documents: IVerificationDocument[];
  status: VerificationStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IVerificationDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mime: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false },
);

const verificationRequestSchema = new Schema<IVerificationRequest>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    documents: {
      type: [documentSchema],
      default: [],
      validate: [(arr: IVerificationDocument[]) => arr.length > 0, "At least one document required"],
    },
    status: { type: String, enum: VERIFICATION_STATUSES as unknown as string[], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

verificationRequestSchema.index({ sellerId: 1, createdAt: -1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });

export const VerificationRequestModel = mongoose.model<IVerificationRequest>(
  "VerificationRequest",
  verificationRequestSchema,
);
