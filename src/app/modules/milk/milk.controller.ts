import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { MilkServices } from "./milk.service.js";
import { StatusCodes } from "http-status-codes";

const createMilk = catchAsync(async (req: Request, res: Response) => {
  const result = await MilkServices.createMilk(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Milk created successfully",
    data: result,
  });
});

const getAllMilks = catchAsync(async (req: Request, res: Response) => {
  const result = await MilkServices.getAllMilks();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Milks retrieved successfully",
    data: result,
  });
});

const deleteMilk = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await MilkServices.deleteMilk(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Milk deleted successfully",
    data: result,
  });
});

export const MilkController = {
  createMilk,
  getAllMilks,
  deleteMilk,
};
