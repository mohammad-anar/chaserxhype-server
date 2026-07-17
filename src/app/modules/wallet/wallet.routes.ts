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
  auth("USER"),
  validateRequest(WalletValidation.addFundsZodSchema),
  WalletController.addFunds
);

export const WalletRouter = router;

