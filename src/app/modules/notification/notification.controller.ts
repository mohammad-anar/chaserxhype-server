import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { StatusCodes } from "http-status-codes";
import { NotificationService } from "./notification.service.js";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getMyNotifications(req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await NotificationService.markAsRead(id, req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All notifications marked as read",
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
