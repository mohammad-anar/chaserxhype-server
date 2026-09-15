import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { StatusCodes } from "http-status-codes";
import { GiftCardServices } from "./giftCard.service.js";
import pick from "../../../helpers/pick.js";

const createGiftCardCheckout = catchAsync(async (req: Request, res: Response) => {
  const purchaserId = req.user?.id || req.user?.userId || null;
  const result = await GiftCardServices.createGiftCardCheckout(purchaserId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.message || "Gift card purchase initialized successfully",
    data: result,
  });
});

const getMyGiftCards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || req.user?.userId;
  const result = await GiftCardServices.getMyGiftCards(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User gift cards retrieved successfully",
    data: result,
  });
});

const redeemGiftCardCode = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || req.user?.userId;
  const result = await GiftCardServices.redeemGiftCardCode(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const updateGiftCardSettings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || req.user?.userId;
  const id = req.params.id as string;
  const result = await GiftCardServices.updateGiftCardSettings(userId, id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Gift card settings updated successfully",
    data: result,
  });
});

const getAllGiftCards = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "status", "isClaimed", "startDate", "endDate"]);
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);
  const result = await GiftCardServices.getAllGiftCards(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All gift cards retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const adminAddFunds = catchAsync(async (req: Request, res: Response) => {
  const result = await GiftCardServices.adminAddFunds(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const checkBalanceByCode = catchAsync(async (req: Request, res: Response) => {
  const code = req.params.code as string;
  const result = await GiftCardServices.checkBalanceByCode(code);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Gift card balance retrieved successfully",
    data: result,
  });
});

export const GiftCardController = {
  createGiftCardCheckout,
  getMyGiftCards,
  redeemGiftCardCode,
  updateGiftCardSettings,
  getAllGiftCards,
  adminAddFunds,
  checkBalanceByCode,
};
