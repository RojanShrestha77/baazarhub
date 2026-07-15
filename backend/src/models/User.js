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

    // argon2id hash (decision #3) — see src/services/passwordService.js.
    passwordHash: { type: String, required: true },

    // Set whenever the password changes, by EITHER flow (decision #1
    // follow-up: self-service and reset both touch this, but revoke
    // sessions differently — see sessionService.js).
    passwordChangedAt: { type: Date },

    // Mass-assignment targets (threat model, Tampering) — role and tier
    // must never be settable from request body. Enforced at TWO layers:
    // (1) the zod schemas in validators/auth.schemas.js only whitelist
    // {email, password}-shaped input and silently strip anything else by
    // default (no .passthrough()), and (2) every User.create()/update()
    // call site builds an explicit field list rather than spreading
    // req.body or even req.validatedBody. Neither layer is optional —
    // either one alone is one refactor away from a hole.
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },

    // Seller verification tier (README: "tiered seller verification").
    // Same mass-assignment reasoning as role — only an admin-only code
    // path (not built in this phase) should ever change this.
    sellerTier: {
      type: String,
      enum: ["unverified", "basic", "verified", "premium"],
      default: "unverified",
    },

    mfaEnabled: { type: Boolean, default: false },
    totpSecret: { type: totpSecretSchema, default: undefined },
    mfaEnrolledAt: { type: Date },

    loginFailure: { type: loginFailureSchema, default: () => ({}) },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model("User", userSchema);
