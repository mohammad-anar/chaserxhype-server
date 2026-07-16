import express from "express";
import { CoinProductController } from "./coinProduct.controller.js";
import { CoinProductValidation } from "./coinProduct.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/",
  auth("ADMIN"),
  validateRequest(CoinProductValidation.createCoinProductZodSchema),
  CoinProductController.createCoinProduct
);

router.get(
  "/",
  CoinProductController.getAllCoinProducts
);

router.get(
  "/:id",
  CoinProductController.getCoinProductById
);

router.patch(
  "/:id",
  auth("ADMIN"),
  validateRequest(CoinProductValidation.updateCoinProductZodSchema),
  CoinProductController.updateCoinProduct
);

router.delete(
  "/:id",
  auth("ADMIN"),
  CoinProductController.deleteCoinProduct
);

export const CoinProductRouter = router;
