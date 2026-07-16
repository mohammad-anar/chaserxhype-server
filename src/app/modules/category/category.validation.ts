import { z } from "zod";

const createCategoryZodSchema = z.object({
  name: z.string({
    message: "Category name is required",
  }),
  isActive: z.boolean().optional(),
});

const updateCategoryZodSchema = z.object({
  name: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};
