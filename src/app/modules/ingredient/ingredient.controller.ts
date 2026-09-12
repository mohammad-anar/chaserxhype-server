import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { IngredientServices } from "./ingredient.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const createIngredient = catchAsync(async (req: Request, res: Response) => {
  const result = await IngredientServices.createIngredient(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Ingredient created successfully",
    data: result,
  });
});

const getAllIngredients = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "isAvailable", "lowStock"]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await IngredientServices.getAllIngredients(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ingredients retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getIngredientById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await IngredientServices.getIngredientById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ingredient retrieved successfully",
    data: result,
  });
});

const updateIngredient = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await IngredientServices.updateIngredient(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ingredient updated successfully",
    data: result,
  });
});

const deleteIngredient = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await IngredientServices.deleteIngredient(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ingredient deleted successfully",
    data: result,
  });
});

const restockIngredient = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await IngredientServices.restockIngredient(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ingredient restocked successfully",
    data: result,
  });
});

const getStockMovements = catchAsync(async (req: Request, res: Response) => {
  const ingredientId = req.query.ingredientId as string | undefined;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await IngredientServices.getStockMovements(ingredientId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Stock movements retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const IngredientController = {
  createIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
  restockIngredient,
  getStockMovements,
};
