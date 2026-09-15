import express from "express";
import auth from "../../middlewares/auth.js";
import { UserRole } from "@prisma/client";
import { LoyaltyController } from "./loyalty.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { LoyaltyValidation } from "./loyalty.validation.js";

const router = express.Router();

// Customer get own profile with QR & points
router.get(
  "/my-profile",
  auth(UserRole.USER, UserRole.BARISTA, UserRole.ADMIN),
  LoyaltyController.getMyLoyaltyProfile
);

// Customer get own points history
router.get(
  "/my-history",
  auth(UserRole.USER, UserRole.BARISTA, UserRole.ADMIN),
  LoyaltyController.getMyPointsHistory
);

// Lookup customer by QR loyalty code (Barista / Admin)
router.get(
  "/lookup/:code",
  auth(UserRole.BARISTA, UserRole.ADMIN),
  LoyaltyController.lookupByLoyaltyCode
);

// Process manual points scan (Barista / Admin)
router.post(
  "/scan",
  auth(UserRole.BARISTA, UserRole.ADMIN),
  validateRequest(LoyaltyValidation.processPointsZodSchema),
  LoyaltyController.processManualPoints
);

// Admin get all point transactions log
router.get(
  "/admin/transactions",
  auth(UserRole.ADMIN),
  LoyaltyController.getAllPointTransactions
);

export const LoyaltyRouter = router;
