import express from "express";
import { PaymentController } from "./payment.controller.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/confirm-payment",
  auth("USER", "ADMIN"),
  PaymentController.confirmPayment
);

router.get(
  "/my-payments",
  auth("USER", "ADMIN"),
  PaymentController.getMyPayments
);

router.get(
  "/my-reward-payments",
  auth("USER", "ADMIN"),
  PaymentController.getMyRewardPayments
);

router.get(
  "/all-payments",
  auth("ADMIN"),
  PaymentController.getAllPayments
);

router.get(
  "/all-reward-payments",
  auth("ADMIN"),
  PaymentController.getAllRewardPayments
);

export const PaymentRouter = router;
