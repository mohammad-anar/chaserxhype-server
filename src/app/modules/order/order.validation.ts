import { z } from "zod";

const checkoutZodSchema = z.object({
  payType: z.enum(["CARD", "STRIPE", "PAYPAL", "APPLE_PAY", "GOOGLE_PAY"] as [string, ...string[]]).optional(),
  note: z.string().optional(),
});

const updateOrderStatusZodSchema = z.object({
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELED",
    "FAILED"
  ] as [string, ...string[]], {
    message: "Status is required and must be a valid OrderStatus"
  })
});

export const OrderValidation = {
  checkoutZodSchema,
  updateOrderStatusZodSchema,
};
