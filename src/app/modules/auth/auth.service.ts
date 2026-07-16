import { prisma } from "../../../helpers/prisma.js";
import config from "../../../config/index.js";
import ApiError from "../../../errors/ApiError.js";
import bcrypt from "bcryptjs";
import generateOTP from "../../../helpers/generateOTP.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";
import { jwtHelper } from "../../../helpers/jwtHelper.js";
import { StatusCodes } from "http-status-codes";
import {
  IVerifyOtpPayload,
  IForgotPasswordPayload,
  IResetPasswordPayload,
  IResendOtpPayload,
  ILoginPayload,
  IChangePasswordPayload,
} from "./auth.interface.js";
import { Secret } from "jsonwebtoken";
import { UserStatus } from "@prisma/client";

const JWT_SECRET = config.jwt.jwt_secret as Secret;


const loginUser = async (payload: ILoginPayload) => {
  const { email, password: inputPassword } = payload;
  if (!email || !inputPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.status === UserStatus.BLOCKED || user.status === UserStatus.SUSPENDED) {
    throw new ApiError(StatusCodes.FORBIDDEN, `Your account status is ${user.status.toLowerCase()}`);
  }

  if (!user.isVerified) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Your email is not verified yet. Please verify your email first.");
  }

  const isPasswordMatch = await bcrypt.compare(inputPassword, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Incorrect email or password");
  }

  // Create token payload
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelper.createToken(
    tokenPayload,
    JWT_SECRET,
    (config.jwt.jwt_expire_in || "1d") as any,
  );

  const refreshToken = jwtHelper.createToken(
    tokenPayload,
    JWT_SECRET,
    (config.jwt.jwt_refresh_expire_in || "30d") as any,
  );

  const { password, ...userWithoutPassword } = user;

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
  };
};

const changePassword = async (userId: string, payload: IChangePasswordPayload) => {
  const { oldPassword, newPassword } = payload;
  if (!oldPassword || !newPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Old and new passwords are required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Incorrect old password");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    config.bcrypt_salt_round || 10,
  );

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
      needPasswordChange: false,
    },
  });

  return { message: "Password updated successfully" };
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;
  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
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

  try {
    const emailVal = emailTemplate.resetPassword({
      email,
      otp: Number(otpCode),
    });
    await emailHelper.sendEmail(emailVal);
  } catch (error) {
    console.error("Failed to send reset password email:", error);
  }

  console.log(`🔑 Reset Password OTP for ${email}: ${otpCode}`);

  return { message: "OTP sent successfully to your email" };
};

const verifyEmail = async (payload: IVerifyOtpPayload) => {
  const { email, otp } = payload;
  if (!email || !otp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (user.isVerified && !user.otpCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User is already verified");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired or is invalid");
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP code has expired");
  }

  if (user.otpCode !== otp.toString()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Incorrect OTP code");
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: {
      isVerified: true,
      otpCode: null,
      otpExpiresAt: null,
      status: UserStatus.ACTIVE,
    },
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

const verifyOtp = async (payload: IVerifyOtpPayload) => {
  const { email, otp } = payload;
  if (!email || !otp) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (!user.otpCode || !user.otpExpiresAt) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP has expired or is invalid");
  }

  if (new Date() > new Date(user.otpExpiresAt)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "OTP code has expired");
  }

  if (user.otpCode !== otp.toString()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Incorrect OTP code");
  }

  const resetToken = jwtHelper.createToken({ email }, JWT_SECRET, "15m");

  return { resetToken };
};




const resetPassword = async (payload: IResetPasswordPayload) => {
  const { password, newPassword } = payload;
  const rawPassword = password || newPassword;

  const resetToken = payload.resetToken;

  if (!resetToken || !rawPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Reset token and new password are required");
  }

  let decoded: any;
  try {
    decoded = jwtHelper.verifyToken(resetToken, JWT_SECRET);
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid or expired reset token");
  }

  const email = decoded.email;
  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid token payload");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
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
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is required");
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
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

  try {
    const emailVal = emailTemplate.createAccount({
      name: user.name || user.email,
      email: user.email,
      otp: Number(otpCode),
    });
    await emailHelper.sendEmail(emailVal);
  } catch (error) {
    console.error("Failed to resend email:", error);
  }

  console.log(`🔑 Resent OTP for ${email}: ${otpCode}`);

  return { message: "OTP code resent successfully" };
};

export const AuthService = {
  verifyEmail,
  loginUser,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
  resendOtp,
};
