import express from "express";
import { ProductMilkController } from "./productMilk.controller.js";
import { ProductMilkValidation } from "./productMilk.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(ProductMilkValidation.createProductMilkZodSchema),
  ProductMilkController.createProductMilk
);

router.get(
  "/",
  ProductMilkController.getAllProductMilks
);

router.get(
  "/product/:productId",
  ProductMilkController.getAllProductMilksByProductId
);

router.get(
  "/:id",
  ProductMilkController.getProductMilkById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(ProductMilkValidation.updateProductMilkZodSchema),
  ProductMilkController.updateProductMilk
);

router.delete(
  "/:id",
  auth("ADMIN"),
  ProductMilkController.deleteProductMilk
);

export const ProductMilkRouter = router;
