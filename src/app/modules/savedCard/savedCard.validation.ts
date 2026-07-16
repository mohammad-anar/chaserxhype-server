import { z } from "zod";

const saveCardZodSchema = z.object({
  cardNumber: z
    .string({
      message: "Card number is required",
    })
    .min(13, "Card number must be at least 13 digits")
    .max(19, "Card number must be at most 19 digits"),
  cvc: z
    .string({
      message: "CVC is required",
    })
    .min(3, "CVC must be at least 3 digits")
    .max(4, "CVC must be at most 4 digits"),
  expireDate: z
    .string({
      message: "Expiry date is required",
    })
    .regex(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, "Expiry date must be in MM/YY format"),
});

const updateCardStatusZodSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"], {
    message: "Status must be either ACTIVE or INACTIVE",
  }),
});

export const SavedCardValidation = {
  saveCardZodSchema,
  updateCardStatusZodSchema,
};
