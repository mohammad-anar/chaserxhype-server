import express from "express";
import { ProductExtraController } from "./productExtra.controller.js";
import { ProductExtraValidation } from "./productExtra.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(ProductExtraValidation.createProductExtraZodSchema),
  ProductExtraController.createProductExtra
);

router.get(
  "/",
  ProductExtraController.getAllProductExtras
);

router.get(
  "/product/:productId",
  ProductExtraController.getAllProductExtrasByProductId
);

router.get(
  "/:id",
  ProductExtraController.getProductExtraById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(ProductExtraValidation.updateProductExtraZodSchema),
  ProductExtraController.updateProductExtra
);

router.delete(
  "/:id",
  auth("ADMIN"),
  ProductExtraController.deleteProductExtra
);

export const ProductExtraRouter = router;
