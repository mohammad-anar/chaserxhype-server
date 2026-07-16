import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ExtraServices } from "./extra.service.js";
import { StatusCodes } from "http-status-codes";

const createExtra = catchAsync(async (req: Request, res: Response) => {
  const result = await ExtraServices.createExtra(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Extra created successfully",
    data: result,
  });
});

const getAllExtras = catchAsync(async (req: Request, res: Response) => {
  const result = await ExtraServices.getAllExtras();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Extras retrieved successfully",
    data: result,
  });
});

const deleteExtra = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ExtraServices.deleteExtra(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Extra deleted successfully",
    data: result,
  });
});

export const ExtraController = {
  createExtra,
  getAllExtras,
  deleteExtra,
};
