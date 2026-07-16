import { z } from "zod";

const createProductZodSchema = z.object({
  name: z.string({
    message: "Product name is required",
  }),
  categoryId: z.string({
    message: "Category ID is required",
  }),
  shortDescription: z.string({
    message: "Short description is required",
  }),
  description: z.string({
    message: "Description is required",
  }),
  basePrice: z.number({
    message: "Base price is required and must be a number",
  }),
  coin: z.number({
    message: "Coin value is required and must be a number",
  }),
  customOption: z.boolean().optional(),
  image: z.array(z.string()).optional(),
  sizes: z
    .array(
      z.object({
        sizeId: z.string({ message: "Size ID is required" }),
        name: z.string({ message: "Size name is required" }),
        oz: z.string({ message: "Ounces is required" }),
        priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    )
    .optional(),
  milks: z
    .array(
      z.object({
        milkId: z.string({ message: "Milk ID is required" }),
        name: z.string({ message: "Milk name is required" }),
        priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    )
    .optional(),
  extras: z
    .array(
      z.object({
        extraId: z.string({ message: "Extra ID is required" }),
        name: z.string({ message: "Extra name is required" }),
        price: z.number({ message: "Price must be a number" }),
      })
    )
    .optional(),
});

const updateProductZodSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.number().optional(),
  coin: z.number().optional(),
  customOption: z.boolean().optional(),
  image: z.array(z.string()).optional(),
  sizes: z
    .array(
      z.object({
        sizeId: z.string().optional(),
        name: z.string().optional(),
        oz: z.string().optional(),
        priceAdjustment: z.number().optional(),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    )
    .optional(),
  milks: z
    .array(
      z.object({
        milkId: z.string().optional(),
        name: z.string().optional(),
        priceAdjustment: z.number().optional(),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    )
    .optional(),
  extras: z
    .array(
      z.object({
        extraId: z.string().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .optional(),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
};
