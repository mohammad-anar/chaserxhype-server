import express from "express";
import { DeliveryFeeController } from "./deliveryFee.controller.js";
import { DeliveryFeeValidation } from "./deliveryFee.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(DeliveryFeeValidation.createDeliveryFeeZodSchema),
  DeliveryFeeController.createDeliveryFee
);

router.get(
  "/",
  auth("ADMIN", "USER"),
  DeliveryFeeController.getAllDeliveryFees
);

router.get(
  "/:id",
  auth("ADMIN", "USER"),
  DeliveryFeeController.getDeliveryFeeById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(DeliveryFeeValidation.updateDeliveryFeeZodSchema),
  DeliveryFeeController.updateDeliveryFee
);

export const DeliveryFeeRouter = router;
