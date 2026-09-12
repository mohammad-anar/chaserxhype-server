import express from "express";
import { WalletController } from "./wallet.controller.js";
import { WalletValidation } from "./wallet.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get(
  "/my-wallet",
  auth("USER", "ADMIN"),
  WalletController.getMyWallet
);

router.get(
  "/",
  auth("ADMIN"),
  WalletController.getAllWallets
);

router.post(
  "/add-funds",
  auth("ADMIN"),
  validateRequest(WalletValidation.addFundsZodSchema),
  WalletController.addFunds
);

router.post(
  "/claim-daily-drop",
  auth("USER", "ADMIN"),
  WalletController.claimDailyDrop
);

router.post(
  "/claim-free-pour",
  auth("USER", "ADMIN"),
  WalletController.claimFreePour
);

export const WalletRouter = router;

