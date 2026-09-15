import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { StatusCodes } from "http-status-codes";
import { LoyaltyServices } from "./loyalty.service.js";
import pick from "../../../helpers/pick.js";

const lookupByLoyaltyCode = catchAsync(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const result = await LoyaltyServices.lookupByLoyaltyCode(code);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Customer loyalty profile retrieved successfully",
    data: result,
  });
});

const processManualPoints = catchAsync(async (req: Request, res: Response) => {
  const staffId = req.user?.id || req.user?.userId;
  const result = await LoyaltyServices.processManualPoints(staffId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Loyalty points processed successfully",
    data: result,
  });
});

const getMyLoyaltyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || req.user?.userId;
  const result = await LoyaltyServices.getMyLoyaltyProfile(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My loyalty profile retrieved successfully",
    data: result,
  });
});

const getMyPointsHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || req.user?.userId;
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await LoyaltyServices.getMyPointsHistory(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My loyalty points history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPointTransactions = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "type", "startDate", "endDate"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await LoyaltyServices.getAllPointTransactions(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All point transactions retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const LoyaltyController = {
  lookupByLoyaltyCode,
  processManualPoints,
  getMyLoyaltyProfile,
  getMyPointsHistory,
  getAllPointTransactions,
};
