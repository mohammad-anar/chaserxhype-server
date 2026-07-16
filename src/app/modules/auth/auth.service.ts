import { prisma } from "../../../helpers/prisma.js";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import bcrypt from "bcryptjs";
import generateOTP from "../../../helpers/generateOTP.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";
import { jwtHelper } from "../../../helpers/jwtHelper.js";
import {
  IVerifyOtpPayload,
  IForgotPasswordPayload,
  IResetPasswordPayload,
  IResendOtpPayload,
} from "./auth.interface.js";
import { Secret } from "jsonwebtoken";

const JWT_SECRET = config.jwt.jwt_secret as Secret;

const verifyEmail = async (payload: IVerifyOtpPayload) => {
  const { email, otp } = payload;
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isVerified && !user.otpCode) {
    throw new ApiError(400, "User is already verified");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(400, "OTP has expired or is invalid");
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    throw new ApiError(400, "OTP code has expired");
  }

  if (user.otpCode !== otp.toString()) {
    throw new ApiError(400, "Incorrect OTP code");
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otpCode = generateOTP().toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.user.update({
    where: { email },
    data: {
      otpCode,
      otpExpiresAt,
    },
  });

  const emailVal = emailTemplate.resetPassword({
    email,
    otp: Number(otpCode),
  });

  await emailHelper.sendEmail(emailVal);

  console.log(`🔑 Reset Password OTP for ${email}: ${otpCode}`);

  return { message: "OTP sent successfully to your email" };
};

const verifyOtp = async (payload: IVerifyOtpPayload) => {
  const { email, otp } = payload;
  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(400, "OTP has expired or is invalid");
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    throw new ApiError(400, "OTP code has expired");
  }

  if (user.otpCode !== otp.toString()) {
    throw new ApiError(400, "Incorrect OTP code");
  }

  const resetToken = jwtHelper.createToken({ email }, JWT_SECRET, "15m");

  return { resetToken };
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { password, newPassword } = payload;
  const rawPassword = password || newPassword;
  
  // Note: resetToken must be passed in headers or body, let's accept it from payload
  const resetToken = (payload as any).resetToken;

  if (!resetToken || !rawPassword) {
    throw new ApiError(400, "Reset token and new password are required");
  }

  let decoded: any;
  try {
    decoded = jwtHelper.verifyToken(resetToken, JWT_SECRET);
  } catch {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const email = decoded.email;
  if (!email) {
    throw new ApiError(400, "Invalid token payload");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hashedPassword = await bcrypt.hash(
    rawPassword,
    config.bcrypt_salt_round || 10,
  );

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      otpCode: null,
      otpExpiresAt: null,
    },
  });

  return { message: "Password reset successfully" };
};

const resendOtp = async (payload: IResendOtpPayload) => {
  const { email } = payload;
  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const otpCode = generateOTP().toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.user.update({
    where: { email },
    data: {
      otpCode,
      otpExpiresAt,
    },
  });

  const emailVal = emailTemplate.createAccount({
    name: user.name || user.email,
    email: user.email,
    otp: Number(otpCode),
  });

  await emailHelper.sendEmail(emailVal);

  console.log(`🔑 Resent OTP for ${email}: ${otpCode}`);

  return { message: "OTP code resent successfully" };
};

export const AuthService = {
  verifyEmail,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
};
