import { prisma } from "../../../helpers/prisma.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";

const getMyWallet = async (userId: string) => {
  let wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  // If wallet doesn't exist (e.g. for legacy users or admins), create it
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  return wallet;
};

const getAllWallets = async (options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.wallet.findMany({
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
          role: true,
        },
      },
    },
  });

  const total = await prisma.wallet.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const addFunds = async (userId: string, payload: { amount: number }) => {
  const { amount } = payload;

  let wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: amount,
      },
    });
  } else {
    wallet = await prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }

  return wallet;
};

const claimDailyDrop = async (userId: string) => {
  let wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  const BONUS_BEANS = 50;

  const updatedWallet = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: {
        increment: BONUS_BEANS,
      },
    },
  });

  return {
    claimedBeans: BONUS_BEANS,
    balance: Number(updatedWallet.balance),
    message: `+${BONUS_BEANS} Loyalty Beans added to your circle balance!`,
  };
};

const claimFreePour = async (userId: string) => {
  const FREE_POUR_COST = 1000;

  let wallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 0,
      },
    });
  }

  if (Number(wallet.balance) < FREE_POUR_COST) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You need 1,000 loyalty beans for a Free Pour. Current balance: ${Number(wallet.balance).toLocaleString()} beans.`
    );
  }

  const voucherCode = `POUR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const updatedWallet = await prisma.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: {
        decrement: FREE_POUR_COST,
      },
    },
  });

  return {
    voucherCode,
    cost: FREE_POUR_COST,
    balance: Number(updatedWallet.balance),
    message: "Your Free Pour voucher has been unlocked! Ready to redeem on your next visit or order.",
  };
};

export const WalletServices = {
  getMyWallet,
  getAllWallets,
  addFunds,
  claimDailyDrop,
  claimFreePour,
};

