import { prisma } from "../../../helpers/prisma.js";
import config from "../../../config/index.js";
import bcrypt from "bcryptjs";
import generateOTP from "../../../helpers/generateOTP.js";
import { emailHelper } from "../../../helpers/emailHelper.js";
import { emailTemplate } from "../../shared/emailTemplate.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import {
  ICreateUserPayload,
  IUpdateUserProfilePayload,
  IUserFilterableFields,
} from "./user.interface.js";

const createUser = async (payload: ICreateUserPayload) => {
  // Check if email already exists
  const existingUserByEmail = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingUserByEmail) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email is already registered");
  }

  // Check if phone already exists (if provided)
  if (payload.phone) {
    const existingUserByPhone = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existingUserByPhone) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Phone number is already registered");
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt_salt_round || 10,
  );

  // Generate verification OTP
  const otpCode = generateOTP().toString();
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Create User and Wallet within a transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        password: hashedPassword,
        otpCode,
        otpExpiresAt,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        isVerified: false,
        profileImage: payload.profileImage || null,
      },
    });

    // Initialize wallet with 0 balance
    await tx.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
      },
    });

    return user;
  });

  // Send verification email
  try {
    const emailVal = emailTemplate.createAccount({
      name: payload.name || payload.email,
      email: payload.email,
      otp: Number(otpCode),
    });
    await emailHelper.sendEmail(emailVal);
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }

  console.log(`🔑 Signup OTP for ${payload.email}: ${otpCode}`);

  const { password, ...userWithoutPassword } = result;
  return userWithoutPassword;
};

const getMyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallets: true,
      addresses: true,
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  const { password, ...userWithoutPassword } = user;
  const stars = user.wallets && user.wallets.length > 0 ? Number(user.wallets[0].balance || 0) : 0;

  return {
    ...userWithoutPassword,
    stars,
  };
};

const updateMyProfile = async (userId: string, payload: IUpdateUserProfilePayload) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (payload.phone && payload.phone !== user.phone) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: payload.phone },
    });
    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Phone number is already in use");
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

const getAllUsers = async (filters: IUserFilterableFields, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, role, status } = filters;

  const andConditions: Prisma.UserWhereInput[] = [{ isDeleted: false }];

  // Search condition
  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // Filter conditions
  if (role) {
    andConditions.push({ role: role as UserRole });
  }

  if (status) {
    andConditions.push({ status: status as UserStatus });
  }

  const whereConditions: Prisma.UserWhereInput = { AND: andConditions };

  const result = await prisma.user.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      wallets: true,
      addresses: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  const total = await prisma.user.count({
    where: whereConditions,
  });

  const usersFormatted = result.map((user) => {
    const { password, ...userWithoutPassword } = user;
    const ordersCount = user._count?.orders ?? user.orders?.length ?? 0;
    
    // Sum total spent for completed/paid orders (or all valid non-cancelled orders)
    const totalSpent = user.orders
      ? user.orders
          .filter((o) => o.status !== "CANCELED" && o.status !== "FAILED")
          .reduce((sum, curr) => sum + Number(curr.total || 0), 0)
      : 0;

    const stars = user.wallets && user.wallets.length > 0 ? Number(user.wallets[0].balance || 0) : 0;

    return {
      ...userWithoutPassword,
      ordersCount,
      totalSpent,
      stars,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: usersFormatted,
  };
};

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      wallets: true,
      addresses: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const { password, ...userWithoutPassword } = user;
  const ordersCount = user._count?.orders ?? user.orders?.length ?? 0;
  const totalSpent = user.orders
    ? user.orders
        .filter((o) => o.status !== "CANCELED" && o.status !== "FAILED")
        .reduce((sum, curr) => sum + Number(curr.total || 0), 0)
    : 0;

  const stars = user.wallets && user.wallets.length > 0 ? Number(user.wallets[0].balance || 0) : 0;

  return {
    ...userWithoutPassword,
    ordersCount,
    totalSpent,
    stars,
  };
};

const updateUserStatus = async (id: string, status: UserStatus) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
  });

  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

const deleteUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  // Soft delete
  await prisma.user.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "User deleted successfully" };
};

export const UserServices = {
  createUser,
  getMyProfile,
  updateMyProfile,
  getAllUsers,
  getUserById,
  updateUserStatus,
  deleteUser,
};
