import { z } from "zod";

const processPointsZodSchema = z.object({
  body: z.object({
    loyaltyCode: z.string({
      message: "Loyalty code is required",
    }),
    points: z
      .number({
        message: "Points number is required",
      })
      .refine((val) => val !== 0, {
        message: "Points cannot be 0",
      }),
    type: z.enum([
      "EARNED_PURCHASE",
      "EARNED_BONUS",
      "REDEEMED_REWARD",
      "ADMIN_ADJUSTMENT",
      "MANUAL_SCAN",
    ]).optional(),
    reason: z.string().optional(),
  }),
});

export const LoyaltyValidation = {
  processPointsZodSchema,
};
