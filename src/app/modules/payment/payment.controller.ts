import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { PaymentServices } from "./payment.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const { sessionId } = req.body;
  const result = await PaymentServices.confirmPayment(sessionId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment confirmed and order completed successfully",
    data: result,
  });
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getMyPayments(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyRewardPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getMyRewardPayments(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My reward coin payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getAllPayments(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllRewardPayments = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getAllRewardPayments(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All reward coin payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const PaymentController = {
  confirmPayment,
  getMyPayments,
  getMyRewardPayments,
  getAllPayments,
  getAllRewardPayments,
};
