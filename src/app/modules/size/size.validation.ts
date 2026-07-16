import { z } from "zod";

const createSizeZodSchema = z.object({
  name: z.string({
    message: "Size name is required",
  }),
});

export const SizeValidation = {
  createSizeZodSchema,
};
