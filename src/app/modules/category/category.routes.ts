import express from "express";
import { CategoryController } from "./category.controller.js";
import { CategoryValidation } from "./category.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);

router.get(
  "/",
  CategoryController.getAllCategories
);

router.get(
  "/admin",
  auth("ADMIN"),
  CategoryController.getAdminCategories
);

router.get(
  "/:id",
  CategoryController.getCategoryById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory
);

router.delete(
  "/:id",
  auth("ADMIN"),
  CategoryController.deleteCategory
);

export const CategoryRouter = router;
