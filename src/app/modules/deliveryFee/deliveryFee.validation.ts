import { z } from "zod";

const createDeliveryFeeZodSchema = z.object({
  title: z.string({
    message: "Title is required",
  }),
  description: z.string().optional(),
  amount: z.number({
    message: "Amount must be a number",
  }).positive("Amount must be greater than zero"),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateDeliveryFeeZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const DeliveryFeeValidation = {
  createDeliveryFeeZodSchema,
  updateDeliveryFeeZodSchema,
};
