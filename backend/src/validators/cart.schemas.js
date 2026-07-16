import { z } from "zod";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// Quantity is validated here for SHAPE (integer, positive) — the actual
// business cap (min(10, listing.quantity)) is enforced in cartService,
// since it depends on live listing state a static schema can't know.
const quantity = z.coerce.number().int().min(1);

export const addCartItemSchema = z
  .object({
    listingId: z.string().regex(OBJECT_ID, "Invalid listing id"),
    quantity,
  })
  .strict();

export const updateCartItemSchema = z.object({ quantity }).strict();
