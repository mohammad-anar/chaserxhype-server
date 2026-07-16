import { z } from "zod";

const createSupportTicketZodSchema = z.object({
  subject: z.string({
    message: "Subject is required",
  }),
  message: z.string({
    message: "Message is required",
  }),
});

const updateSupportTicketStatusZodSchema = z.object({
  status: z.enum(["PENDING", "RESOLVED"], {
    message: "Status must be either PENDING or RESOLVED",
  }),
});

export const SupportTicketValidation = {
  createSupportTicketZodSchema,
  updateSupportTicketStatusZodSchema,
};
