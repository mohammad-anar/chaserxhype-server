import { z } from "zod";

const createIngredientZodSchema = z.object({
  name: z.string().min(1, "Ingredient name is required"),
  unit: z.string().min(1, "Unit is required"),
  currentStock: z.number().min(0, "Current stock must be 0 or greater"),
  reservedStock: z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

const updateIngredientZodSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  reservedStock: z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

const restockZodSchema = z.object({
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: z.string().optional(),
});

export const IngredientValidation = {
  createIngredientZodSchema,
  updateIngredientZodSchema,
  restockZodSchema,
};
