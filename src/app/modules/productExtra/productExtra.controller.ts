import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductExtraServices } from "./productExtra.service.js";
import { StatusCodes } from "http-status-codes";

const createProductExtra = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductExtraServices.createProductExtra(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Product extra added successfully",
    data: result,
  });
});

const getAllProductExtras = catchAsync(async (req: Request, res: Response) => {
  const productId = req.query.productId as string | undefined;
  const result = await ProductExtraServices.getAllProductExtras(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product extras retrieved successfully",
    data: result,
  });
});

const getProductExtraById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductExtraServices.getProductExtraById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product extra retrieved successfully",
    data: result,
  });
});

const updateProductExtra = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductExtraServices.updateProductExtra(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product extra updated successfully",
    data: result,
  });
});

const deleteProductExtra = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductExtraServices.deleteProductExtra(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product extra deleted successfully",
    data: result,
  });
});

export const ProductExtraController = {
  createProductExtra,
  getAllProductExtras,
  getProductExtraById,
  updateProductExtra,
  deleteProductExtra,
};
