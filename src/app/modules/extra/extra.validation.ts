import { z } from "zod";

const createExtraZodSchema = z.object({
  name: z.string({
    message: "Extra name is required",
  }),
});

export const ExtraValidation = {
  createExtraZodSchema,
};
