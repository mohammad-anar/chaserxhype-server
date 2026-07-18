import express from "express";
import { ProductSizeController } from "./productSize.controller.js";
import { ProductSizeValidation } from "./productSize.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(ProductSizeValidation.createProductSizeZodSchema),
  ProductSizeController.createProductSize
);

router.get(
  "/",
  ProductSizeController.getAllProductSizes
);

router.get(
  "/product/:productId",
  ProductSizeController.getAllProductSizesByProductId
);

router.get(
  "/:id",
  ProductSizeController.getProductSizeById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(ProductSizeValidation.updateProductSizeZodSchema),
  ProductSizeController.updateProductSize
);

router.delete(
  "/:id",
  auth("ADMIN"),
  ProductSizeController.deleteProductSize
);

export const ProductSizeRouter = router;
