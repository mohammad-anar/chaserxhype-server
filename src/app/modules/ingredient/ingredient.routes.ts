import express from "express";
import { IngredientController } from "./ingredient.controller.js";
import { IngredientValidation } from "./ingredient.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get("/stock-movements", auth("ADMIN", "BARISTA"), IngredientController.getStockMovements);

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(IngredientValidation.createIngredientZodSchema),
  IngredientController.createIngredient
);

router.get("/", auth("ADMIN", "BARISTA", "USER"), IngredientController.getAllIngredients);

router.get("/:id", auth("ADMIN", "BARISTA", "USER"), IngredientController.getIngredientById);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(IngredientValidation.updateIngredientZodSchema),
  IngredientController.updateIngredient
);

router.delete("/:id", auth("ADMIN"), IngredientController.deleteIngredient);

router.post(
  "/:id/restock",
  auth("ADMIN", "BARISTA"),
  validateRequest(IngredientValidation.restockZodSchema),
  IngredientController.restockIngredient
);

export const IngredientRouter = router;
