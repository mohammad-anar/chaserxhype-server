import express from "express";
import { ProductController } from "./product.controller.js";
import { ProductValidation } from "./product.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import fileUploadHandler from "../../middlewares/fileUploadHandler.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  fileUploadHandler(),
  validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct
);

router.get(
  "/",
  ProductController.getAllProducts
);

router.get(
  "/:id",
  ProductController.getProductById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  fileUploadHandler(),
  validateRequest(ProductValidation.updateProductZodSchema),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  auth("ADMIN"),
  ProductController.deleteProduct
);

export const ProductRouter = router;
