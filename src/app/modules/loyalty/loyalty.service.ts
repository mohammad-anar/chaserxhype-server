import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { PointTxType, Prisma } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import {
  IProcessLoyaltyPointsPayload,
  ILoyaltyFilterableFields,
} from "./loyalty.interface.js";

const lookupByLoyaltyCode = async (code: string) => {
  const cleanCode = code.trim().toUpperCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { loyaltyCode: cleanCode },
        { id: code.trim() },
        { email: { equals: code.trim(), mode: "insensitive" } },
      ],
      isDeleted: false,
    },
    include: {
      wallets: true,
      orders: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      pointTransactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, `Customer with loyalty code "${code}" not found`);
  }

  const { password, otpCode, otpExpiresAt, ...userWithoutSensitive } = user;
  const stars = user.wallets && user.wallets.length > 0 ? Number(user.wallets[0].balance || 0) : 0;

  return {
    ...userWithoutSensitive,
    stars,
    recentTransactions: user.pointTransactions,
  };
};

const processManualPoints = async (
  staffId: string,
  payload: IProcessLoyaltyPointsPayload
) => {
  const { loyaltyCode, points, type, reason } = payload;
  const cleanCode = loyaltyCode.trim().toUpperCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { loyaltyCode: cleanCode },
        { id: loyaltyCode.trim() },
        { email: { equals: loyaltyCode.trim(), mode: "insensitive" } },
      ],
      isDeleted: false,
    },
    include: {
      wallets: true,
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Customer not found");
  }

  const currentWallet = user.wallets && user.wallets.length > 0 ? user.wallets[0] : null;
  const currentBalance = currentWallet ? Number(currentWallet.balance || 0) : 0;

  if (points < 0 && Math.abs(points) > currentBalance) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Insufficient loyalty points. Current balance is ${currentBalance} points, but attempting to deduct ${Math.abs(points)} points.`
    );
  }

  const txType = type || (points > 0 ? PointTxType.MANUAL_SCAN : PointTxType.REDEEMED_REWARD);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Update or create wallet
    let wallet = await tx.wallet.findFirst({
      where: { userId: user.id },
    });

    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          balance: points > 0 ? points : 0,
        },
      });
    } else {
      wallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: points,
          },
        },
      });
    }

    // 2. Record PointTransaction
    const pointTx = await tx.pointTransaction.create({
      data: {
        userId: user.id,
        staffId,
        points,
        type: txType,
        reason: reason || (points > 0 ? "Counter scan point reward" : "Counter point redemption"),
      },
    });

    return {
      wallet,
      pointTx,
    };
  });

  return {
    userId: user.id,
    customerName: user.name,
    loyaltyCode: user.loyaltyCode,
    pointsAdjusted: points,
    newBalance: Number(result.wallet.balance),
    transaction: result.pointTx,
  };
};

const getMyLoyaltyProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      wallets: true,
      pointTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  let loyaltyCode = user.loyaltyCode;
  if (!loyaltyCode) {
    // Auto-generate if missing for legacy users
    loyaltyCode = `CH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    await prisma.user.update({
      where: { id: userId },
      data: { loyaltyCode },
    });
  }

  const stars = user.wallets && user.wallets.length > 0 ? Number(user.wallets[0].balance || 0) : 0;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    loyaltyCode,
    stars,
    pointTransactions: user.pointTransactions,
  };
};

const getMyPointsHistory = async (userId: string, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.pointTransaction.findMany({
    where: { userId },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
        },
      },
    },
  });

  const total = await prisma.pointTransaction.count({
    where: { userId },
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getAllPointTransactions = async (
  filters: ILoyaltyFilterableFields,
  options: any
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, type, startDate, endDate } = filters;
  const andConditions: Prisma.PointTransactionWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      user: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
          { loyaltyCode: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
    });
  }

  if (type) {
    andConditions.push({ type });
  }

  if (startDate || endDate) {
    andConditions.push({
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    });
  }

  const whereConditions: Prisma.PointTransactionWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.pointTransaction.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          loyaltyCode: true,
        },
      },
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
    },
  });

  const total = await prisma.pointTransaction.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

export const LoyaltyServices = {
  lookupByLoyaltyCode,
  processManualPoints,
  getMyLoyaltyProfile,
  getMyPointsHistory,
  getAllPointTransactions,
};
