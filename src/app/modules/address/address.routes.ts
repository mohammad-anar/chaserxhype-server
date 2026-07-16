import express from "express";
import { AddressController } from "./address.controller.js";
import { AddressValidation } from "./address.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("USER", "ADMIN"),
  validateRequest(AddressValidation.createAddressZodSchema),
  AddressController.createAddress
);

router.get(
  "/my-addresses",
  auth("USER", "ADMIN"),
  AddressController.getMyAddresses
);

router.get(
  "/:id",
  auth("USER", "ADMIN"),
  AddressController.getAddressById
);

router.patch(
  "/:id",
  auth("USER", "ADMIN"),
  validateRequest(AddressValidation.updateAddressZodSchema),
  AddressController.updateAddress
);

router.delete(
  "/:id",
  auth("USER", "ADMIN"),
  AddressController.deleteAddress
);

export const AddressRouter = router;
