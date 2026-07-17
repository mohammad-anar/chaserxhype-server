import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { CartServices } from "./cart.service.js";
import { StatusCodes } from "http-status-codes";

const addCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CartServices.addCartItem(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item added to cart successfully",
    data: result,
  });
});

const getCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CartServices.getCart(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart retrieved successfully",
    data: result,
  });
});

const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const cartItemId = req.params.cartItemId as string;
  const result = await CartServices.updateCartItem(userId, cartItemId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart item updated successfully",
    data: result,
  });
});

const removeCartItem = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const cartItemId = req.params.cartItemId as string;
  const result = await CartServices.removeCartItem(userId, cartItemId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Item removed from cart successfully",
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await CartServices.clearCart(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cart cleared successfully",
    data: result,
  });
});

export const CartController = {
  addCartItem,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
