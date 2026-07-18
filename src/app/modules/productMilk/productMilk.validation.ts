import { z } from "zod";

const createProductMilkZodSchema = z.object({
  productId: z.string({ message: "Product ID is required" }),
  name: z.string({ message: "Milk name is required" }),
  priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
  adjustmentType: z.enum(["ADD", "SUBTRACT"], {
    message: "Adjustment type must be ADD or SUBTRACT",
  }),
});

const updateProductMilkZodSchema = z.object({
  name: z.string().optional(),
  priceAdjustment: z.number().optional(),
  adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
});

export const ProductMilkValidation = {
  createProductMilkZodSchema,
  updateProductMilkZodSchema,
};
