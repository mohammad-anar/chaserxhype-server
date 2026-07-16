import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductMilkServices } from "./productMilk.service.js";
import { StatusCodes } from "http-status-codes";

const createProductMilk = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductMilkServices.createProductMilk(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Product milk added successfully",
    data: result,
  });
});

const getAllProductMilks = catchAsync(async (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  const result = await ProductMilkServices.getAllProductMilks(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product milks retrieved successfully",
    data: result,
  });
});

const getProductMilkById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductMilkServices.getProductMilkById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product milk retrieved successfully",
    data: result,
  });
});

const updateProductMilk = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductMilkServices.updateProductMilk(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product milk updated successfully",
    data: result,
  });
});

const deleteProductMilk = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductMilkServices.deleteProductMilk(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product milk deleted successfully",
    data: result,
  });
});

export const ProductMilkController = {
  createProductMilk,
  getAllProductMilks,
  getProductMilkById,
  updateProductMilk,
  deleteProductMilk,
};
