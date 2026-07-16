import { prisma } from "../../../helpers/prisma.js";
import config from "../../../config/index.js";
import { createPatientPayload } from "./user.interface.js";
import bcrypt from "bcryptjs";
import generateOTP from "../../../helpers/generateOTP.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";

const createPatient = async (payload: createPatientPayload) => {
  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_round || 10,
  );

  const otpCode = generateOTP().toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const result = await prisma.$transaction(async (tnx: any) => {
    const user = await tnx.user.create({
      data: {
        email: payload.email,
        password: hashedPassword,
        name: payload.name,
        otpCode,
        otpExpiresAt,
      },
    });

    const patient = await tnx.patient.create({
      data: {
        email: payload.email,
        name: payload.name,
        address: "Not Provided",
      },
    });

    return { user, patient };
  });

  // Send verification email
  const emailVal = emailTemplate.createAccount({
    name: payload.name || payload.email,
    email: payload.email,
    otp: Number(otpCode),
  });

  await emailHelper.sendEmail(emailVal);

  console.log(`🔑 Signup OTP for ${payload.email}: ${otpCode}`);

  return result;
};

export const UserSerivces = {
  createPatient,
};
