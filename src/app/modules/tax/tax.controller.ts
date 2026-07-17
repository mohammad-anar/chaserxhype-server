import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { TaxServices } from "./tax.service.js";
import { StatusCodes } from "http-status-codes";

const createTax = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxServices.createTax(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Tax configuration created successfully",
    data: result,
  });
});

const getAllTaxes = catchAsync(async (req: Request, res: Response) => {
  const result = await TaxServices.getAllTaxes();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tax configurations retrieved successfully",
    data: result,
  });
});

const getTaxById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await TaxServices.getTaxById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tax configuration retrieved successfully",
    data: result,
  });
});

const updateTax = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await TaxServices.updateTax(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Tax configuration updated successfully",
    data: result,
  });
});

export const TaxController = {
  createTax,
  getAllTaxes,
  getTaxById,
  updateTax,
};
