import express from "express";
import { CartController } from "./cart.controller.js";
import { CartValidation } from "./cart.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/add-item",
  auth("USER", "ADMIN"),
  validateRequest(CartValidation.addCartItemZodSchema),
  CartController.addCartItem
);

router.get(
  "/",
  auth("USER", "ADMIN"),
  CartController.getCart
);

router.patch(
  "/update-item/:cartItemId",
  auth("USER", "ADMIN"),
  validateRequest(CartValidation.updateCartItemZodSchema),
  CartController.updateCartItem
);

router.delete(
  "/remove-item/:cartItemId",
  auth("USER", "ADMIN"),
  CartController.removeCartItem
);

router.delete(
  "/clear",
  auth("USER", "ADMIN"),
  CartController.clearCart
);

export const CartRouter = router;
