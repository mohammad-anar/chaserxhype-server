import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AddressServices } from "./address.service.js";
import { StatusCodes } from "http-status-codes";

const createAddress = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await AddressServices.createAddress(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Address created successfully",
    data: result,
  });
});

const getMyAddresses = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await AddressServices.getMyAddresses(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Addresses retrieved successfully",
    data: result,
  });
});

const getAddressById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;

  const result = await AddressServices.getAddressById(userId, userRole, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Address retrieved successfully",
    data: result,
  });
});

const updateAddress = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;

  const result = await AddressServices.updateAddress(userId, userRole, id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Address updated successfully",
    data: result,
  });
});

const deleteAddress = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;

  const result = await AddressServices.deleteAddress(userId, userRole, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Address deleted successfully",
    data: result,
  });
});

export const AddressController = {
  createAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
};
