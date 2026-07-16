import { z } from "zod";

// Mirrors the enums on models/User.js exactly — zod is the outer gate,
// the schema enum is the inner one; neither alone is sufficient (same
// two-layer reasoning as the mass-assignment comment in models/User.js).
export const roleChangeSchema = z.object({
  role: z.enum(["buyer", "seller", "admin"]),
}).strict();

export const tierChangeSchema = z.object({
  sellerTier: z.enum(["unverified", "verified", "trusted"]),
}).strict();
