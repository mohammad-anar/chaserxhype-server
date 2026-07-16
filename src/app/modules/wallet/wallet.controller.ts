import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { WalletServices } from "./wallet.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const getMyWallet = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await WalletServices.getMyWallet(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Wallet balance retrieved successfully",
    data: result,
  });
});

const getAllWallets = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await WalletServices.getAllWallets(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All wallets retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const WalletController = {
  getMyWallet,
  getAllWallets,
};
