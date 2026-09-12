import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { BaristaServices } from "./barista.service.js";
import { StatusCodes } from "http-status-codes";

const getAllBaristas = catchAsync(async (req: Request, res: Response) => {
  const result = await BaristaServices.getAllBaristas();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Baristas retrieved successfully",
    data: result,
  });
});

const updateBaristaProfile = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await BaristaServices.updateBaristaProfile(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Barista profile updated successfully",
    data: result,
  });
});

const assignBaristaToOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const baristaId = req.body.baristaId as string | undefined;
  const result = await BaristaServices.assignBaristaToOrder(orderId, baristaId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Barista assigned successfully",
    data: result,
  });
});

const createBarista = catchAsync(async (req: Request, res: Response) => {
  const result = await BaristaServices.createBarista(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Barista created successfully",
    data: result,
  });
});

const getMyBaristaProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?.userId;
  const result = await BaristaServices.getMyBaristaProfile(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Barista profile retrieved successfully",
    data: result,
  });
});

const updateMyBaristaProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id || (req as any).user?.userId;
  const result = await BaristaServices.updateMyBaristaProfile(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Barista profile updated successfully",
    data: result,
  });
});

const claimOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const baristaId = (req as any).user?.id || (req as any).user?.userId;
  const result = await BaristaServices.claimOrder(orderId, baristaId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order claimed successfully",
    data: result,
  });
});

export const BaristaController = {
  getAllBaristas,
  updateBaristaProfile,
  getMyBaristaProfile,
  updateMyBaristaProfile,
  assignBaristaToOrder,
  claimOrder,
  createBarista,
};
