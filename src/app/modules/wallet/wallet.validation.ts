import { z } from "zod";

const addFundsZodSchema = z.object({
  amount: z
    .number({
      message: "Amount must be a number",
    })
    .positive("Amount must be greater than zero"),
});

export const WalletValidation = {
  addFundsZodSchema,
};
