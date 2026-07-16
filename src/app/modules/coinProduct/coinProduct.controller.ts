import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { CoinProductServices } from "./coinProduct.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const createCoinProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await CoinProductServices.createCoinProduct(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Coin product created successfully",
    data: result,
  });
});

const getAllCoinProducts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm"]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await CoinProductServices.getAllCoinProducts(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Coin products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getCoinProductById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await CoinProductServices.getCoinProductById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Coin product retrieved successfully",
    data: result,
  });
});

const updateCoinProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await CoinProductServices.updateCoinProduct(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Coin product updated successfully",
    data: result,
  });
});

const deleteCoinProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await CoinProductServices.deleteCoinProduct(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Coin product deleted successfully",
    data: result,
  });
});

export const CoinProductController = {
  createCoinProduct,
  getAllCoinProducts,
  getCoinProductById,
  updateCoinProduct,
  deleteCoinProduct,
};
