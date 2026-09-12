import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { RecipeServices } from "./recipe.service.js";
import { StatusCodes } from "http-status-codes";

const setProductRecipe = catchAsync(async (req: Request, res: Response) => {
  const result = await RecipeServices.setProductRecipe(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product recipe configured successfully",
    data: result,
  });
});

const getProductRecipe = catchAsync(async (req: Request, res: Response) => {
  const productId = req.params.productId as string;
  const result = await RecipeServices.getProductRecipe(productId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product recipe retrieved successfully",
    data: result,
  });
});

const addRecipeItem = catchAsync(async (req: Request, res: Response) => {
  const result = await RecipeServices.addRecipeItem(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Recipe item added successfully",
    data: result,
  });
});

const updateRecipeItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await RecipeServices.updateRecipeItem(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recipe item updated successfully",
    data: result,
  });
});

const deleteRecipeItem = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await RecipeServices.deleteRecipeItem(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Recipe item deleted successfully",
    data: result,
  });
});

const getAllRecipes = catchAsync(async (req: Request, res: Response) => {
  const result = await RecipeServices.getAllRecipes();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All product recipes retrieved successfully",
    data: result,
  });
});

export const RecipeController = {
  setProductRecipe,
  getProductRecipe,
  addRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
  getAllRecipes,
};
