import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AIServices } from "./ai.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const getMoodRecommendation = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id || null;
  const result = await AIServices.getMoodRecommendation(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Mood-based recommendations generated successfully",
    data: result,
  });
});

const naturalLanguageProductSearch = catchAsync(async (req: Request, res: Response) => {
  const result = await AIServices.naturalLanguageProductSearch(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Products filtered by natural language query successfully",
    data: result,
  });
});

const customerAssistantChat = catchAsync(async (req: Request, res: Response) => {
  const result = await AIServices.customerAssistantChat(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Assistant response generated successfully",
    data: result,
  });
});

const getRecommendationHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.role === "ADMIN" ? undefined : req.user?.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await AIServices.getRecommendationHistory(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recommendation history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const AIController = {
  getMoodRecommendation,
  naturalLanguageProductSearch,
  customerAssistantChat,
  getRecommendationHistory,
};
