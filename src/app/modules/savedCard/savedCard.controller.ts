import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { SavedCardServices } from "./savedCard.service.js";
import { StatusCodes } from "http-status-codes";

const createSavedCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SavedCardServices.createSavedCard(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Card saved successfully",
    data: result,
  });
});

const getMyCards = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await SavedCardServices.getMyCards(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Saved cards retrieved successfully",
    data: result,
  });
});

const getCardById = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;

  const result = await SavedCardServices.getCardById(userId, userRole, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Saved card retrieved successfully",
    data: result,
  });
});

const deleteCard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;

  const result = await SavedCardServices.deleteCard(userId, userRole, id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Saved card deleted successfully",
    data: result,
  });
});

const updateCardStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const id = req.params.id as string;
  const { status } = req.body;

  const result = await SavedCardServices.updateCardStatus(userId, userRole, id, status);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Saved card status updated successfully",
    data: result,
  });
});

export const SavedCardController = {
  createSavedCard,
  getMyCards,
  getCardById,
  deleteCard,
  updateCardStatus,
};
