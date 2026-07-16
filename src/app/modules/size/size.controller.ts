import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SizeServices } from "./size.service.js";
import { StatusCodes } from "http-status-codes";

const createSize = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeServices.createSize(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Size created successfully",
    data: result,
  });
});

const getAllSizes = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeServices.getAllSizes();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Sizes retrieved successfully",
    data: result,
  });
});

const deleteSize = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await SizeServices.deleteSize(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Size deleted successfully",
    data: result,
  });
});

export const SizeController = {
  createSize,
  getAllSizes,
  deleteSize,
};
