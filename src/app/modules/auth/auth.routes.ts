import express from "express";
import { AuthController } from "./auth.controller.js";
import { AuthValidation } from "./auth.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
import auth from "../../middlewares/auth.js";

const router = express.Router();

// User authentication / login
router.post(
  "/login",
  validateRequest(AuthValidation.loginZodSchema),
  AuthController.loginUser
);

// Account Activation / Email verification via OTP
router.post(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmailZodSchema),
  AuthController.verifyEmail
);

// Resend Verification / Action OTP
router.post(
  "/resend-otp",
  validateRequest(AuthValidation.resendOtpZodSchema),
  AuthController.resendOtp
);

// Trigger forgot password flow
router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordZodSchema),
  AuthController.forgotPassword
);

// Verify forgot password OTP to acquire reset token
router.post(
  "/verify-otp",
  validateRequest(AuthValidation.verifyOtpZodSchema),
  AuthController.verifyOtp
);

// Reset password using reset token
router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordZodSchema),
  AuthController.resetPassword
);

// Change password (logged-in user)
router.post(
  "/change-password",
  auth("USER", "ADMIN"),
  validateRequest(AuthValidation.changePasswordZodSchema),
  AuthController.changePassword
);

// Refresh Access Token
router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshTokenZodSchema),
  AuthController.refreshToken
);

// Alias for access-token route
router.post(
  "/access-token",
  validateRequest(AuthValidation.refreshTokenZodSchema),
  AuthController.refreshToken
);

export const AuthRoutes = router;

