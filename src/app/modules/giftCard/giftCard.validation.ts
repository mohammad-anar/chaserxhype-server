import { z } from "zod";

const createGiftCardZodSchema = z.object({

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
});
const createGiftCardOrderZodSchema = z.object({

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
});
const redeemGiftCardZodSchema = z.object({

  code: z.string({
    message: "Gift card redemption code is required",
  }),
});
const updateGiftCardZodSchema = z.object({

  nickname: z.string().optional(),
  isActive: z.boolean().optional(),
});
const adminAddFundsZodSchema = z.object({
  giftCardId: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  amount: z
    .number({
      message: "Amount is required",
    })
    .positive("Amount must be greater than 0"),
  reason: z.string().optional(),
});

const createGiftCardStyleZodSchema = z.object({
  name: z.string({ message: "Style name is required" }),
  image: z.string({ message: "Style image URL is required" }),
  order: z.number().int().optional().default(0),
});

const updateGiftCardStyleZodSchema = z.object({
  name: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
  order: z.number().int().optional(),
});

const adminUpdateGiftCardZodSchema = z.object({
  nickname: z.string().optional(),
  recipientName: z.string().optional(),
  recipientEmail: z.string().email("Invalid email").optional(),
  personalMessage: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DEPLETED", "EXPIRED"]).optional(),
  isActive: z.boolean().optional(),
  designIndex: z.number().int().optional(),
});

export const GiftCardValidation = {
  createGiftCardZodSchema,
  createGiftCardOrderZodSchema,
  redeemGiftCardZodSchema,
  updateGiftCardZodSchema,
  adminAddFundsZodSchema,
  createGiftCardStyleZodSchema,
  updateGiftCardStyleZodSchema,
  adminUpdateGiftCardZodSchema,
};
