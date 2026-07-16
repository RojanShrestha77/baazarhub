import mongoose from "mongoose";

const { Schema } = mongoose;

const auditLogSchema = new Schema({
  actor:    { type: Schema.Types.ObjectId, ref: "User" },
  subject:  { type: Schema.Types.ObjectId, ref: "User" },
  action:   { type: String, required: true },
  outcome:  { type: String, enum: ["success", "failure"], default: "success" },
  ip:       { type: String },
  userAgent:{ type: String },
  metadata: { type: Schema.Types.Mixed },
  before:   { type: Schema.Types.Mixed },
  after:    { type: Schema.Types.Mixed },
  createdAt:{ type: Date, default: Date.now },
});

auditLogSchema.index({ subject: 1, createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ ip: 1, createdAt: -1 });
auditLogSchema.index({ outcome: 1 });

auditLogSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("AuditLog is append-only — updates are not allowed"));
  }
  next();
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

const FORBIDDEN = [
  "deleteOne", "deleteMany", "findOneAndUpdate", "findOneAndReplace",
  "updateOne", "updateMany", "replaceOne", "findByIdAndUpdate",
  "findByIdAndDelete", "findOneAndDelete", "bulkWrite",
];
FORBIDDEN.forEach((m) => { AuditLog[m] = undefined; });

export { AuditLog };
