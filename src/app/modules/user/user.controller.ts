import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import { UserSerivces } from "./user.service.js";
import sendResponse from "../../shared/sendResponse.js";

const createPatient = catchAsync(async (req: Request, res: Response) => {
  const result = await UserSerivces.createPatient(req.body);
  
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Patient registered successfully. Verification OTP sent to email.",
    data: result,
  });
});

export const UserController = {
  createPatient,
};
