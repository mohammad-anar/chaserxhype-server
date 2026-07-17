import express from "express";
import { ServiceChargeController } from "./serviceCharge.controller.js";
import { ServiceChargeValidation } from "./serviceCharge.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(ServiceChargeValidation.createServiceChargeZodSchema),
  ServiceChargeController.createServiceCharge
);

router.get(
  "/",
  auth("ADMIN", "USER"),
  ServiceChargeController.getAllServiceCharges
);

router.get(
  "/:id",
  auth("ADMIN", "USER"),
  ServiceChargeController.getServiceChargeById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(ServiceChargeValidation.updateServiceChargeZodSchema),
  ServiceChargeController.updateServiceCharge
);

export const ServiceChargeRouter = router;
