import { z } from "zod";

const shippingAddressZodSchema = z.object({
  fullName: z.string().optional(),
  street1: z.string({ message: "street1 is required" }),
  state: z.string().optional(),
  city: z.string({ message: "city is required" }),
  country: z.string({ message: "country is required" }),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
});

const checkoutZodSchema = z.object({
  payType: z.enum(["CARD", "STRIPE", "PAYPAL", "APPLE_PAY", "GOOGLE_PAY"] as [string, ...string[]]).optional(),
  note: z.string().optional(),
  shippingAddress: shippingAddressZodSchema.optional(),
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
