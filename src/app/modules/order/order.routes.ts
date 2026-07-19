import express from "express";
import { OrderController } from "./order.controller.js";
import { OrderValidation } from "./order.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.post(
  "/checkout",
  auth("USER", "ADMIN"),
  validateRequest(OrderValidation.checkoutZodSchema),
  OrderController.checkout
);

router.get(
  "/my-orders",
  auth("USER", "ADMIN"),
  OrderController.getMyOrders
);

router.get(
  "/all-orders",
  auth("ADMIN"),
  OrderController.getAllOrders
);

router.get(
  "/:orderId",
  auth("USER", "ADMIN"),
  OrderController.getOrderById
);

router.patch(
  "/status/:orderId",
  auth("ADMIN"),
  OrderController.updateOrderStatus
);

router.post(
  "/refund/:orderId",
  auth("ADMIN"),
  OrderController.refundOrder
);

export const OrderRouter = router;
