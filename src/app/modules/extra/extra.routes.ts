import express from "express";
import { ExtraController } from "./extra.controller.js";
import { ExtraValidation } from "./extra.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(ExtraValidation.createExtraZodSchema),
  ExtraController.createExtra
);

router.get(
  "/",
  ExtraController.getAllExtras
);

router.delete(
  "/:id",
  auth("ADMIN"),
  ExtraController.deleteExtra
);

export const ExtraRouter = router;
