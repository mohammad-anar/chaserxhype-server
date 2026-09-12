import express from "express";
import { RecipeController } from "./recipe.controller.js";
import { RecipeValidation } from "./recipe.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get("/", auth("ADMIN", "BARISTA"), RecipeController.getAllRecipes);

router.post(
  "/set",
  auth("ADMIN"),
  validateRequest(RecipeValidation.setProductRecipeZodSchema),
  RecipeController.setProductRecipe
);

router.post(
  "/item",
  auth("ADMIN"),
  validateRequest(RecipeValidation.addRecipeItemZodSchema),
  RecipeController.addRecipeItem
);

router.get("/:productId", auth("ADMIN", "BARISTA", "USER"), RecipeController.getProductRecipe);

router.patch(
  "/item/:id",
  auth("ADMIN"),
  validateRequest(RecipeValidation.updateRecipeItemZodSchema),
  RecipeController.updateRecipeItem
);

router.delete("/item/:id", auth("ADMIN"), RecipeController.deleteRecipeItem);

export const RecipeRouter = router;
