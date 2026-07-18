import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductSizeServices } from "./productSize.service.js";
import { StatusCodes } from "http-status-codes";

const createProductSize = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductSizeServices.createProductSize(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Product size added successfully",
    data: result,
  });
});

const getAllProductSizes = catchAsync(async (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  const result = await ProductSizeServices.getAllProductSizes(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product sizes retrieved successfully",
    data: result,
  });
});

const getAllProductSizesByProductId = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const result = await ProductSizeServices.getAllProductSizes(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product sizes retrieved successfully",
    data: result,
  });
});

const getProductSizeById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductSizeServices.getProductSizeById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product size retrieved successfully",
    data: result,
  });
});

const updateProductSize = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductSizeServices.updateProductSize(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product size updated successfully",
    data: result,
  });
});

const deleteProductSize = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductSizeServices.deleteProductSize(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product size deleted successfully",
    data: result,
  });
});

export const ProductSizeController = {
  createProductSize,
  getAllProductSizes,
  getAllProductSizesByProductId,
  getProductSizeById,
  updateProductSize,
  deleteProductSize,
};
