import mongoose from "mongoose";

const { Schema } = mongoose;

// Append-only record of privilege-relevant admin actions (Phase 2, Slice
// 2). Never updated or deleted by application code — only ever created.
const auditLogSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  before: { type: Schema.Types.Mixed },
  after: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ subject: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
