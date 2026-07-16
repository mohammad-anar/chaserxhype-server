import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { AuthService } from "./auth.service.js";
import { StatusCodes } from "http-status-codes";

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyEmail(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Email verified successfully.",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP sent successfully to your email.",
    data: result,
  });
});

const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyOtp(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP verified successfully.",
    data: result,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    resetToken: req.headers.authorization || req.body.resetToken,
  };
  
  const result = await AuthService.resetPassword(payload);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Password reset successfully.",
    data: result,
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.resendOtp(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "OTP code resent successfully.",
    data: result,
  });
});

export const AuthController = {
  verifyEmail,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
};
