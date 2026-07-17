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
  productSize: z
    .array(
      z.object({
        sizeId: z.string({ message: "Size ID is required" }),
        oz: z.string({ message: "Ounces is required" }),
        priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    )
    .optional(),
  productMilk: z
    .array(
      z.object({
        milkId: z.string({ message: "Milk ID is required" }),
        priceAdjustment: z.number({ message: "Price adjustment must be a number" }),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    )
    .optional(),
  productExtra: z
    .array(
      z.object({
        extraId: z.string({ message: "Extra ID is required" }),
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
  productSize: z
    .array(
      z.object({
        id: z.string({ message: "ProductSize record ID is required for update" }),
        oz: z.string().optional(),
        priceAdjustment: z.number().optional(),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    )
    .optional(),
  productMilk: z
    .array(
      z.object({
        id: z.string({ message: "ProductMilk record ID is required for update" }),
        priceAdjustment: z.number().optional(),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    )
    .optional(),
  productExtra: z
    .array(
      z.object({
        id: z.string({ message: "ProductExtra record ID is required for update" }),
        price: z.number().optional(),
      })
    )
    .optional(),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
};
