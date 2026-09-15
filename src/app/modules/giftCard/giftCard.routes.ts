import express from "express";
import auth from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { GiftCardController } from "./giftCard.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { GiftCardValidation } from "./giftCard.validation.js";

const router = express.Router();

// Public or optional-auth: purchase a gift card
router.post(
  "/checkout",
  validateRequest(GiftCardValidation.createGiftCardZodSchema),
  GiftCardController.createGiftCardCheckout
);

// Authenticated user: get my gift cards and balance
router.get(
  "/my-cards",
  auth(UserRole.USER, UserRole.BARISTA, UserRole.ADMIN),
  GiftCardController.getMyGiftCards
);

// Authenticated user: redeem a 16-character code
router.post(
  "/redeem",
  auth(UserRole.USER, UserRole.BARISTA, UserRole.ADMIN),
  validateRequest(GiftCardValidation.redeemGiftCardZodSchema),
  GiftCardController.redeemGiftCardCode
);

// Authenticated user: update card nickname or toggle isActive (freeze/unfreeze)
router.patch(
  "/my-cards/:id",
  auth(UserRole.USER, UserRole.BARISTA, UserRole.ADMIN),
  validateRequest(GiftCardValidation.updateGiftCardZodSchema),
  GiftCardController.updateGiftCardSettings
);

// Check balance by code (public)
router.get(
  "/balance/:code",
  GiftCardController.checkBalanceByCode
);

// Admin: view all issued gift cards
router.get(
  "/admin/all",
  auth(UserRole.ADMIN),
  GiftCardController.getAllGiftCards
);

// Admin: add funds to any gift card or customer account
router.post(
  "/admin/add-funds",
  auth(UserRole.ADMIN),
  validateRequest(GiftCardValidation.adminAddFundsZodSchema),
  GiftCardController.adminAddFunds
);

export const GiftCardRouter = router;
