import mongoose from "mongoose";

const { Schema } = mongoose;

// Server-side sessions in Mongo (decision #1). The cookie carries an opaque
// random token; only its hash is stored here, so a DB leak alone doesn't
// hand out usable session tokens directly (same reasoning as password/
// recovery-code hashing — never store the bearer credential itself).
const sessionSchema = new Schema({
  tokenHash: { type: String, required: true },

  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

  // Sliding window: extended by your middleware on each active request.
  // TTL index below reaps the document once Mongo's background task
  // notices expiresAt has passed — that's garbage collection, NOT your
  // revocation mechanism. Your session-lookup middleware MUST re-check
  // expiresAt (and absoluteExpiresAt) itself on every read; the TTL
  // reaper runs on a ~60s interval and is not a synchronous guarantee.
  expiresAt: { type: Date, required: true },

  // Fixed at creation, never extended. Backstop for undetected long-lived
  // compromise even if the sliding window keeps getting refreshed by an
  // attacker's traffic. TODO (yours): pick the cap duration.
  absoluteExpiresAt: { type: Date, required: true },

  // Pre-MFA vs post-MFA state lives here, server-side — NOT as a client-
  // supplied or token-embedded claim. This is the field decision #1 was
  // largely about: a JWT claim for this is an MFA bypass waiting to happen.
  mfaVerified: { type: Boolean, default: false },

  // Explicit revocation flag for logout / logout-all / password-change
  // flows, so revocation is a synchronous write your middleware checks
  // immediately — it does not wait on the TTL reaper or rely on deletion
  // alone (deletion also works; this flag lets you keep a revoked record
  // around briefly for audit/repudiation purposes if you want that later).
  revokedAt: { type: Date },

  ip: { type: String },
  userAgent: { type: String },

  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
});

sessionSchema.index({ tokenHash: 1 }, { unique: true });
// "Logout everywhere" and password-change invalidation both need to find
// every session for a user fast.
sessionSchema.index({ userId: 1 });
// TTL index — expireAfterSeconds: 0 means "expire at the time stored in the
// field itself" (expiresAt), not a fixed offset from insertion. Confirmed
// this is GC, not enforcement — see the comment on expiresAt above.
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model("Session", sessionSchema);
