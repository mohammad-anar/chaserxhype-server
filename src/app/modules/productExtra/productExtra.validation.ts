import { z } from "zod";

const createProductExtraZodSchema = z.object({
  productId: z.string({ message: "Product ID is required" }),
  extraId: z.string({ message: "Extra ID is required" }),
  name: z.string({ message: "Extra name is required" }),
  price: z.number({ message: "Price must be a number" }),
});

const updateProductExtraZodSchema = z.object({
  name: z.string().optional(),
  price: z.number().optional(),
});

export const ProductExtraValidation = {
  createProductExtraZodSchema,
  updateProductExtraZodSchema,
};
