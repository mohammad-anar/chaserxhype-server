//role
import bcrypt from "bcryptjs";
import config from "../config/index.js";
import { prisma } from "../helpers/prisma.js";
import { Role } from "../types/enum.js";

export const seedSuperAdmin = async () => {
  console.log("Checking for Admin with email:", config.admin.email);

  // Now prisma.user.findFirst cannot be undefined
  const isExist = await prisma.user.findFirst({
    where: {
      email: config.admin.email,
      role: Role.ADMIN,
    },
  });

  if (!isExist) {
    const hashedPassword = await bcrypt.hash(
      config.admin.password as string,
      config.bcrypt_salt_round,
    );

    await prisma.user.create({
      data: {
        name: config.admin.name as string,
        email: config.admin.email as string,
        phone: config.admin.phone as string,
        password: hashedPassword,
        profileImage: config.admin.avatar as string,
        role: Role.ADMIN,
        isVerified: true,
      },
    });
  } else {
    console.log("Super admin already exist.");
  }
};
