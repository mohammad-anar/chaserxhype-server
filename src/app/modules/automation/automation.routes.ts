import express from "express";
import { AutomationController } from "./automation.controller.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get("/:orderId", auth("ADMIN", "BARISTA", "USER"), AutomationController.getOrderAutomationStatus);

router.post("/retry/:orderId", auth("ADMIN"), AutomationController.retryOrderAutomation);

export const AutomationRouter = router;
