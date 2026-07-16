import { z } from "zod";

export const checkoutSchema = z.object({
  listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(["refunded", "released"]),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
export type ResolveDisputeDto = z.infer<typeof resolveDisputeSchema>;
