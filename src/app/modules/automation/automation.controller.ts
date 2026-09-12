import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AutomationServices } from "./automation.service.js";
import { StatusCodes } from "http-status-codes";

const getOrderAutomationStatus = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const result = await AutomationServices.getOrderAutomationStatus(orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order automation status retrieved successfully",
    data: result,
  });
});

const retryOrderAutomation = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const result = await AutomationServices.retryOrderAutomation(orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order automation retried successfully",
    data: result,
  });
});

export const AutomationController = {
  getOrderAutomationStatus,
  retryOrderAutomation,
};
