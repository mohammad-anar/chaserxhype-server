import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ServiceChargeServices } from "./serviceCharge.service.js";
import { StatusCodes } from "http-status-codes";

const createServiceCharge = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceChargeServices.createServiceCharge(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Service charge configuration created successfully",
    data: result,
  });
});

const getAllServiceCharges = catchAsync(async (req: Request, res: Response) => {
  const result = await ServiceChargeServices.getAllServiceCharges();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service charge configurations retrieved successfully",
    data: result,
  });
});

const getServiceChargeById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ServiceChargeServices.getServiceChargeById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service charge configuration retrieved successfully",
    data: result,
  });
});

const updateServiceCharge = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ServiceChargeServices.updateServiceCharge(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Service charge configuration updated successfully",
    data: result,
  });
});

export const ServiceChargeController = {
  createServiceCharge,
  getAllServiceCharges,
  getServiceChargeById,
  updateServiceCharge,
};
