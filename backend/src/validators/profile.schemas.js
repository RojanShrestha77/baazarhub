import { z } from "zod";

// Exactly the user-settable fields on models/Profile.js — kept in sync
// deliberately, not derived from the model, so a future field added to one
// without the other is a visible two-file diff, not a silent gap. .strict()
// rejects unknown keys outright (role, sellerTier, mfaEnabled, etc. all
// bounce as a 400, not a silently-ignored 200) — defense in depth on top
// of those fields not existing on Profile at all.
export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().max(60).optional(),
    bio: z.string().trim().max(500).optional(),
    location: z.string().trim().max(120).optional(),
  })
  .strict();
