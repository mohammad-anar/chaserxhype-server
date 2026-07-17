import { prisma } from "../../../helpers/prisma.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";

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

export const WalletServices = {
  getMyWallet,
  getAllWallets,
  addFunds,
};

