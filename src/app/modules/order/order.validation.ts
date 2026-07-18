import { z } from "zod";

const checkoutZodSchema = z.object({
  payType: z.enum(["CARD", "STRIPE", "PAYPAL", "APPLE_PAY", "GOOGLE_PAY"] as [string, ...string[]]).optional(),
  note: z.string().optional(),
});

export const OrderValidation = {
  checkoutZodSchema,
};
