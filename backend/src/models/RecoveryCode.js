import mongoose from "mongoose";

const { Schema } = mongoose;

// Recovery codes (decision #5). 10 generated at enrolment via
// crypto.randomBytes, shown once, hashed with argon2id before storage —
// not because the entropy needs a slow hash, but so there's one hashing
// approach in the codebase with no special case to explain later.
//
// Regeneration invalidates the whole old set: TODO (yours) is a
// deleteMany({ userId }) followed by inserting a fresh batch of 10, not a
// per-code replace.
const recoveryCodeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

  codeHash: { type: String, required: true },

  used: { type: Boolean, default: false },
  usedAt: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

// Unique per user, not globally — two different users independently
// generating the same random code is astronomically unlikely but not
// worth scoping globally-unique when per-user is what actually matters.
recoveryCodeSchema.index({ userId: 1, codeHash: 1 }, { unique: true });
recoveryCodeSchema.index({ userId: 1, used: 1 });

// TODO (yours): the single-use consumption path. This MUST be one atomic
// findOneAndUpdate matching { userId, codeHash, used: false } and setting
// { used: true, usedAt: now } in a single round trip — a separate
// look-up-then-write is the TOCTOU gap covered in tests/auth/recovery-code.test.js.
// Example shape (fill in, don't copy blind):
//
//   const result = await RecoveryCode.findOneAndUpdate(
//     { userId, codeHash, used: false },
//     { $set: { used: true, usedAt: new Date() } },
//     { new: true },
//   );
//   // result === null means: already used, or wrong code — same response
//   // either way, per decision #7 (no differential signal).

export const RecoveryCode = mongoose.model("RecoveryCode", recoveryCodeSchema);
