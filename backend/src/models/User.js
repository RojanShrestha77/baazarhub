import mongoose from "mongoose";

const { Schema } = mongoose;

// TOTP secret is never stored in plaintext (decision #4) — AES-256-GCM
// ciphertext + IV + auth tag, encrypted/decrypted by your service layer
// using TOTP_ENCRYPTION_KEY_V{keyVersion} from the environment. keyVersion
// lets the key rotate without forcing mass MFA re-enrolment: old documents
// stay decryptable under the key version they were written with.
const totpSecretSchema = new Schema(
  {
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    keyVersion: { type: Number, required: true },
  },
  { _id: false },
);

// Per-account exponential backoff state (decision #6). This is NOT a binary
// lock — a hard lock is an attacker-triggerable DoS button against a seller.
// TODO (yours): the actual backoff calculation (delay curve, cap, reset-on-
// success) lives in your auth service, not here. These fields just hold the
// state it reads/writes.
const loginFailureSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    nextAttemptAllowedAt: { type: Date },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    // argon2id hash (decision #3). TODO (yours): hashing/verification calls,
    // and the dummy-hash-on-nonexistent-user timing parity path (decision #7).
    passwordHash: { type: String, required: true },

    // Set whenever the password changes, by EITHER flow (decision #1
    // follow-up). Your session-invalidation logic reads this — it does not
    // by itself invalidate anything.
    passwordChangedAt: { type: Date },

    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },

    mfaEnabled: { type: Boolean, default: false },
    totpSecret: { type: totpSecretSchema, default: undefined },
    mfaEnrolledAt: { type: Date },

    loginFailure: { type: loginFailureSchema, default: () => ({}) },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

// TODO (yours): never construct this model from a raw req.body spread —
// that's the mass-assignment path flagged in the threat model (client
// sending { role: "admin" } or similar). Build an explicit allow-list per
// endpoint (e.g. { email, passwordHash } for registration) instead.
export const User = mongoose.model("User", userSchema);
