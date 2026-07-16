import { z } from "zod";

export const rejectVerificationSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(500, "Rejection reason too long"),
});
