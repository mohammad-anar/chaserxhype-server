import { z } from "zod";

const createMilkZodSchema = z.object({
  name: z.string({
    message: "Milk name is required",
  }),
});

export const MilkValidation = {
  createMilkZodSchema,
};
