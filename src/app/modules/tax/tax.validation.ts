import { z } from "zod";

const createTaxZodSchema = z.object({
  title: z.string({
    message: "Title is required",
  }),
  description: z.string().optional(),
  amount: z.number({
    message: "Amount must be a number",
  }).positive("Amount must be greater than zero"),
  type: z.enum(["PERCENTAGE", "FIXED"], {
    message: "Type must be PERCENTAGE or FIXED",
  }),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateTaxZodSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const TaxValidation = {
  createTaxZodSchema,
  updateTaxZodSchema,
};
