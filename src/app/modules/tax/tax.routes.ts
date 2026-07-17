import express from "express";
import { TaxController } from "./tax.controller.js";
import { TaxValidation } from "./tax.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(TaxValidation.createTaxZodSchema),
  TaxController.createTax
);

router.get(
  "/",
  auth("ADMIN", "USER"),
  TaxController.getAllTaxes
);

router.get(
  "/:id",
  auth("ADMIN", "USER"),
  TaxController.getTaxById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(TaxValidation.updateTaxZodSchema),
  TaxController.updateTax
);

export const TaxRouter = router;
