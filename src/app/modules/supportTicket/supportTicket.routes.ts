import express from "express";
import { SupportTicketController } from "./supportTicket.controller.js";
import { SupportTicketValidation } from "./supportTicket.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

// Only regular users can request support help
router.post(
  "/",
  auth("USER"),
  validateRequest(SupportTicketValidation.createSupportTicketZodSchema),
  SupportTicketController.createSupportTicket
);

// Admin-only view support tickets
router.get(
  "/",
  auth("ADMIN"),
  SupportTicketController.getAllSupportTickets
);

// Admin-only update ticket status
router.patch(
  "/:id/status",
  auth("ADMIN"),
  validateRequest(SupportTicketValidation.updateSupportTicketStatusZodSchema),
  SupportTicketController.updateSupportTicketStatus
);

export const SupportTicketRouter = router;
