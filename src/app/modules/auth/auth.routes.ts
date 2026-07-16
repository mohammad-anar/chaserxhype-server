import express from "express";
import { AuthController } from "./auth.controller.js";

const router = express.Router();

router.post("/verify-email", AuthController.verifyEmail);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/reset-password", AuthController.resetPassword);
router.post("/resend-otp", AuthController.resendOtp);

export const AuthRoutes = router;
