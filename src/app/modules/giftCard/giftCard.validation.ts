import { z } from "zod";

const createGiftCardZodSchema = z.object({
  body: z.object({
    designIndex: z.number().int().min(0).max(3).optional().default(0),
    amount: z
      .number({
        message: "Gift card amount is required",
      })
      .positive("Amount must be greater than 0"),
    recipientName: z.string({
      message: "Recipient name is required",
    }),
    recipientEmail: z.string().email("Invalid email format"),
    personalMessage: z.string().optional(),
    nickname: z.string().optional(),
  }),
});

const createGiftCardOrderZodSchema = z.object({
  body: z.object({
    designIndex: z.number().int().min(0).max(3).optional().default(0),
    amount: z
      .number({
        message: "Gift card amount is required",
      })
      .positive("Amount must be greater than 0"),
    recipientName: z.string({
      message: "Recipient name is required",
    }),
    recipientEmail: z.string().email("Invalid email format"),
    personalMessage: z.string().optional(),
    nickname: z.string().optional(),
  }),
});

const redeemGiftCardZodSchema = z.object({
  body: z.object({
    code: z.string({
      message: "Gift card redemption code is required",
    }),
  }),
});

const updateGiftCardZodSchema = z.object({
  body: z.object({
    nickname: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const adminAddFundsZodSchema = z.object({
  body: z.object({
    giftCardId: z.string().optional(),
    userId: z.string().optional(),
    email: z.string().optional(),
    amount: z
      .number({
        message: "Amount is required",
      })
      .positive("Amount must be greater than 0"),
    reason: z.string().optional(),
  }),
});

export const GiftCardValidation = {
  createGiftCardZodSchema,
  createGiftCardOrderZodSchema,
  redeemGiftCardZodSchema,
  updateGiftCardZodSchema,
  adminAddFundsZodSchema,
};
