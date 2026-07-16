import mongoose from "mongoose";

const { Schema } = mongoose;

// Deliberately separate from User, not fields bolted onto it. Every field
// on THIS model is user-settable by design — role/sellerTier/mfaEnabled/
// emailVerified live only on User, which this model has no reference into
// beyond userId. That means mass assignment onto identity/privilege state
// isn't something profileService has to filter out on the way in — those
// fields simply don't exist here to assign to. "Structurally impossible,"
// not "filtered ad hoc" (Phase 2, Slice 3 decision).
const profileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    displayName: { type: String, trim: true, maxlength: 60, default: "" },
    bio: { type: String, trim: true, maxlength: 500, default: "" },
    location: { type: String, trim: true, maxlength: 120, default: "" },

    // Server-generated filename only (see middleware/avatarUpload.js) —
    // never derived from anything a client sends.
    avatarPath: { type: String, default: null },
  },
  { timestamps: true },
);

export const Profile = mongoose.model("Profile", profileSchema);
