import express from "express";
import { InvoiceController } from "./invoice.controller.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

router.get("/", auth("ADMIN", "BARISTA"), InvoiceController.getAllInvoices);

router.get("/:orderId", auth("ADMIN", "BARISTA", "USER"), InvoiceController.getInvoiceByOrderId);

router.post("/generate/:orderId", auth("ADMIN"), InvoiceController.generateInvoice);

export const InvoiceRouter = router;
