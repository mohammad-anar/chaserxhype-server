import { z } from "zod";

const createProductSizeZodSchema = z.object({
  productId: z.string({ message: "Product ID is required" }),
  name: z.string({ message: "Size name is required" }),
  oz: z.string({ message: "Ounces is required" }),
  priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
  adjustmentType: z.enum(["ADD", "SUBTRACT"], {
    message: "Adjustment type must be ADD or SUBTRACT",
  }),
});

const updateProductSizeZodSchema = z.object({
  name: z.string().optional(),
  oz: z.string().optional(),
  priceAdjustment: z.number().optional(),
  adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
});

export const ProductSizeValidation = {
  createProductSizeZodSchema,
  updateProductSizeZodSchema,
};
