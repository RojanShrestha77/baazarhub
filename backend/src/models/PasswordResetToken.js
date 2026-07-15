import mongoose from "mongoose";

const { Schema } = mongoose;

// Decision #1 recovery flow. Token itself is high-entropy and machine-
// generated (crypto.randomBytes via sessionToken.js's generator, reused
// here), so it's hashed with SHA-256 before storage — same reasoning as
// session tokens, not argon2id (no offline-guessing advantage to defend
// against for a 256-bit random value; see sessionToken.js).
const passwordResetTokenSchema = new Schema({
  tokenHash: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

  used: { type: Boolean, default: false },
  usedAt: { type: Date },

  // Short expiry, independent of the TTL index — same discipline as
  // Session: the TTL index below is garbage collection, not enforcement.
  // The confirm route re-checks expiresAt itself.
  expiresAt: { type: Date, required: true },

  createdAt: { type: Date, default: Date.now },
});

passwordResetTokenSchema.index({ tokenHash: 1 });
passwordResetTokenSchema.index({ userId: 1 });
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
