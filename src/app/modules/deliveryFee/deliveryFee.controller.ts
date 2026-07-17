import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { DeliveryFeeServices } from "./deliveryFee.service.js";
import { StatusCodes } from "http-status-codes";

const createDeliveryFee = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryFeeServices.createDeliveryFee(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Delivery fee configuration created successfully",
    data: result,
  });
});

const getAllDeliveryFees = catchAsync(async (req: Request, res: Response) => {
  const result = await DeliveryFeeServices.getAllDeliveryFees();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Delivery fee configurations retrieved successfully",
    data: result,
  });
});

const getDeliveryFeeById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DeliveryFeeServices.getDeliveryFeeById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Delivery fee configuration retrieved successfully",
    data: result,
  });
});

const updateDeliveryFee = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await DeliveryFeeServices.updateDeliveryFee(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Delivery fee configuration updated successfully",
    data: result,
  });
});

export const DeliveryFeeController = {
  createDeliveryFee,
  getAllDeliveryFees,
  getDeliveryFeeById,
  updateDeliveryFee,
};
