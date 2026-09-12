import { z } from "zod";

const setProductRecipeZodSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  items: z
    .array(
      z.object({
        ingredientId: z.string().min(1, "Ingredient ID is required"),
        quantity: z.number().positive("Quantity must be greater than 0"),
        unit: z.string().min(1, "Unit is required"),
      })
    )
    .min(1, "At least one recipe item is required"),
});

const addRecipeItemZodSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  ingredientId: z.string().min(1, "Ingredient ID is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  unit: z.string().min(1, "Unit is required"),
});

const updateRecipeItemZodSchema = z.object({
  quantity: z.number().positive("Quantity must be greater than 0").optional(),
  unit: z.string().min(1).optional(),
});

export const RecipeValidation = {
  setProductRecipeZodSchema,
  addRecipeItemZodSchema,
  updateRecipeItemZodSchema,
};
