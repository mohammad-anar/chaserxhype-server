import { z } from "zod";

const createCoinProductZodSchema = z.object({
  name: z.string({
    message: "Name is required",
  }),
  needPoint: z
    .number({
      message: "needPoint is required and must be a number",
    })
    .int("needPoint must be an integer")
    .positive("needPoint must be positive"),
});

const updateCoinProductZodSchema = z.object({
  name: z.string().optional(),
  needPoint: z
    .number()
    .int("needPoint must be an integer")
    .positive("needPoint must be positive")
    .optional(),
});

export const CoinProductValidation = {
  createCoinProductZodSchema,
  updateCoinProductZodSchema,
};
