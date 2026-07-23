import express from "express";
import auth from "../../middlewares/auth.js";
import { NotificationController } from "./notification.controller.js";

const router = express.Router();

router.get(
  "/my-notifications",
  auth("USER", "ADMIN"),
  NotificationController.getMyNotifications
);

router.patch(
  "/read-all",
  auth("USER", "ADMIN"),
  NotificationController.markAllAsRead
);

router.patch(
  "/read/:id",
  auth("USER", "ADMIN"),
  NotificationController.markAsRead
);

export const NotificationRouter = router;
