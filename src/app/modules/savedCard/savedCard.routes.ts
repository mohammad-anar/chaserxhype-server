import express from "express";
import { SavedCardController } from "./savedCard.controller.js";
import { SavedCardValidation } from "./savedCard.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("USER", "ADMIN"),
  validateRequest(SavedCardValidation.saveCardZodSchema),
  SavedCardController.createSavedCard
);

router.get(
  "/my-cards",
  auth("USER", "ADMIN"),
  SavedCardController.getMyCards
);

router.get(
  "/:id",
  auth("USER", "ADMIN"),
  SavedCardController.getCardById
);

router.delete(
  "/:id",
  auth("USER", "ADMIN"),
  SavedCardController.deleteCard
);

router.patch(
  "/:id/status",
  auth("USER", "ADMIN"),
  validateRequest(SavedCardValidation.updateCardStatusZodSchema),
  SavedCardController.updateCardStatus
);

export const SavedCardRouter = router;
