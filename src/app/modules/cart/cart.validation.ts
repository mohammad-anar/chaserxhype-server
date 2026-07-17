import { z } from "zod";

const addCartItemZodSchema = z.object({
  isCoinProduct: z.boolean({
    message: "isCoinProduct must be a boolean",
  }),
  quantity: z
    .number({
      message: "Quantity must be a number",
    })
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than zero"),
  productId: z.string().optional(),
  coinProductId: z.string().optional(),
  selectedSizeId: z.string().optional(),
  selectedMildId: z.string().optional(),
  extras: z.array(z.string()).optional(),
});

const updateCartItemZodSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive()
    .optional(),
  selectedSizeId: z.string().optional(),
  selectedMildId: z.string().optional(),
  extras: z.array(z.string()).optional(),
});

export const CartValidation = {
  addCartItemZodSchema,
  updateCartItemZodSchema,
};
