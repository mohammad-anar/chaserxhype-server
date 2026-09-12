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
  "/barista/assigned-orders",
  auth("BARISTA", "ADMIN"),
  OrderController.getBaristaAssignedOrders
);

router.get(
  "/tips/daily-summary",
  auth("ADMIN"),
  OrderController.getDailyTipsSummary
);

router.post(
  "/tip/:orderId",
  auth("USER", "ADMIN"),
  validateRequest(OrderValidation.addTipZodSchema),
  OrderController.addTipToOrder
);

router.get(
  "/:orderId",
  auth("USER", "ADMIN", "BARISTA"),
  OrderController.getOrderById
);

router.patch(
  "/status/:orderId",
  auth("ADMIN", "BARISTA"),
  validateRequest(OrderValidation.updateOrderStatusZodSchema),
  OrderController.updateOrderStatus
);

router.post(
  "/refund/:orderId",
  auth("ADMIN"),
  OrderController.refundOrder
);

export const OrderRouter = router;
