import { Profile } from "../models/Profile.js";

// Explicit field list even though req.validatedBody is already
// strict-schema-limited — same double-layer discipline as User.js's
// mass-assignment comment: never spread a request-derived object into a
// Mongoose write, even one that's already been validated.
const ALLOWED_FIELDS = ["displayName", "bio", "location"];

export async function getOrCreateProfile(userId) {
  let profile = await Profile.findOne({ userId });
  if (!profile) {
    profile = await Profile.create({ userId });
  }
  return profile;
}

export async function updateProfile(userId, patch) {
  const set = {};
  for (const field of ALLOWED_FIELDS) {
    if (patch[field] !== undefined) {
      set[field] = patch[field];
    }
  }

  return Profile.findOneAndUpdate(
    { userId },
    { $set: set, $setOnInsert: { userId } },
    { new: true, upsert: true },
  );
}

export async function setAvatarPath(userId, avatarPath) {
  return Profile.findOneAndUpdate(
    { userId },
    { $set: { avatarPath }, $setOnInsert: { userId } },
    { new: true, upsert: true },
  );
}

// Two separate functions, not one serializer with a delete()-on-the-way-out
// flag — a forgotten flag on a future call site is a data leak, a forgotten
// import of the wrong function is a compile-time-visible mistake at worst.

// For viewing someone else's profile — no identity/privilege fields, ever.
export function serializePublicProfile(profile) {
  return {
    id: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio,
    location: profile.location,
    hasAvatar: Boolean(profile.avatarPath),
  };
}

// Only for the profile's own owner — includes account-identity fields
// pulled from the User doc (never from client input).
export function serializePrivateProfile(profile, user) {
  return {
    id: profile.userId,
    displayName: profile.displayName,
    bio: profile.bio,
    location: profile.location,
    hasAvatar: Boolean(profile.avatarPath),
    email: user.email,
    role: user.role,
    sellerTier: user.sellerTier,
    mfaEnabled: user.mfaEnabled,
  };
}
