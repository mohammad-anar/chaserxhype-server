import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { OrderServices } from "./order.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";
import { OrderStatus } from "@prisma/client";

const checkout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await OrderServices.checkout(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await OrderServices.getMyOrders(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My orders retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id as string;
  const role = req.user.role as string;
  const orderId = req.params.orderId as string;
  const result = await OrderServices.getOrderById(userId, role, orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order retrieved successfully",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder", "status", "searchTerm"]);
  const result = await OrderServices.getAllOrders(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All orders retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const { status } = req.body;
  const result = await OrderServices.updateOrderStatus(orderId, status as OrderStatus);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

const refundOrder = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const result = await OrderServices.refundOrder(orderId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Order refunded successfully",
    data: result,
  });
});

const getBaristaAssignedOrders = catchAsync(async (req: Request, res: Response) => {
  const baristaId = req.user.id || req.user.userId;
  const options = pick(req.query, ["status", "view", "searchTerm"]);
  const result = await OrderServices.getBaristaOrders(baristaId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Barista orders retrieved successfully",
    meta: {
      page: 1,
      limit: result.data.length,
      total: result.data.length,
    },
    data: {
      orders: result.data,
      summary: result.meta,
    },
  });
});

const addTipToOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id || req.user.userId;
  const orderId = req.params.orderId as string;
  const result = await OrderServices.addTipToOrder(userId, orderId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Thank you! Tip added successfully to your order.",
    data: result,
  });
});

const getDailyTipsSummary = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["startDate", "endDate"]);
  const result = await OrderServices.getDailyTipsSummary(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Daily tips summary retrieved successfully",
    data: result,
  });
});

export const OrderController = {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getBaristaAssignedOrders,
  updateOrderStatus,
  refundOrder,
  addTipToOrder,
  getDailyTipsSummary,
};
