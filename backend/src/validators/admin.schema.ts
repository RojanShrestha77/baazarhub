import { z } from "zod";

// Mirrors the enums on the User model exactly — zod is the outer gate, the
// schema enum is the inner one; neither alone is sufficient.
export const roleChangeSchema = z.object({ role: z.enum(["buyer", "seller", "admin"]) }).strict();

export const tierChangeSchema = z.object({ sellerTier: z.enum(["unverified", "verified", "trusted"]) }).strict();

export type RoleChangeDto = z.infer<typeof roleChangeSchema>;
export type TierChangeDto = z.infer<typeof tierChangeSchema>;
