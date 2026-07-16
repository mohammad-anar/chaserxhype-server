import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SupportTicketServices } from "./supportTicket.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const createSupportTicket = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SupportTicketServices.createSupportTicket(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Support ticket submitted successfully",
    data: result,
  });
});

const getAllSupportTickets = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "status", "date", "startDate", "endDate"]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await SupportTicketServices.getAllSupportTickets(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support tickets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateSupportTicketStatus = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status } = req.body;

  const result = await SupportTicketServices.updateSupportTicketStatus(id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Support ticket status updated successfully",
    data: result,
  });
});

export const SupportTicketController = {
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
};
