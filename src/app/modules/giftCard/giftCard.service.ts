import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { GiftCardStatus, GiftCardTxType, Prisma } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import Stripe from "stripe";
import config from "../../../config/index.js";
import {
  ICreateGiftCardPayload,
  IRedeemGiftCardPayload,
  IUpdateGiftCardPayload,
  IAdminAddFundsPayload,
  IGiftCardFilterableFields,
} from "./giftCard.interface.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");

const generateGiftCardCode = () => {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GC-${segment()}-${segment()}-${segment()}`;
};

const createGiftCardCheckout = async (
  purchaserId: string | null,
  payload: ICreateGiftCardPayload
) => {
  const {
    amount,
    recipientName,
    recipientEmail,
    personalMessage,
    designIndex = 0,
    nickname,
  } = payload;

  const normalizedEmail = recipientEmail.trim().toLowerCase();
  const code = generateGiftCardCode();

  // Check if recipient already has an account
  const recipientUser = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      isDeleted: false,
    },
  });

  const cardNickname = nickname || `${recipientName}'s Coffee Pass`;

  // Create gift card record
  const giftCard = await prisma.giftCard.create({
    data: {
      code,
      nickname: cardNickname,
      designIndex: designIndex || 0,
      initialAmount: amount,
      currentBalance: amount,
      status: GiftCardStatus.ACTIVE,
      isActive: true,
      recipientName: recipientName.trim(),
      recipientEmail: normalizedEmail,
      personalMessage: personalMessage || null,
      purchaserId: purchaserId || null,
      userId: recipientUser ? recipientUser.id : null,
      isClaimed: recipientUser ? true : false,
      claimedAt: recipientUser ? new Date() : null,
    },
  });

  // If recipient already exists, credit user's gift card balance and create transaction log
  if (recipientUser) {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: recipientUser.id },
        data: {
          giftCardBalance: {
            increment: amount,
          },
        },
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          userId: recipientUser.id,
          amount,
          type: GiftCardTxType.PURCHASE,
          title: "Reload / Gift Received",
          location: "Online",
        },
      });
    });
  }

  // Generate Stripe Checkout session for payment if Stripe is configured
  let paymentUrl: string | null = null;
  if (config.stripe.stripe_secret_key) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Bean Fien Digital Gift Card ($${amount.toFixed(2)})`,
                description: `Gift Card for ${recipientName} (${normalizedEmail})`,
              },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        customer_email: purchaserId ? undefined : normalizedEmail,
        success_url: `${frontendUrl}/gift-cards?status=success&code=${code}`,
        cancel_url: `${frontendUrl}/gift-cards?status=cancelled`,
        metadata: {
          giftCardId: giftCard.id,
          giftCardCode: code,
          amount: amount.toString(),
          recipientEmail: normalizedEmail,
        },
      });
      paymentUrl = session.url;
    } catch (err) {
      console.warn("Stripe session creation note (fallback to direct activation):", err);
    }
  }

  return {
    giftCard,
    paymentUrl,
    message: "Gift card created successfully",
  };
};

const getMyGiftCards = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  const normalizedEmail = user.email.toLowerCase();

  // Find all cards linked to user ID or email
  const cards = await prisma.giftCard.findMany({
    where: {
      OR: [
        { userId: user.id },
        { recipientEmail: { equals: normalizedEmail, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  // Calculate total active balance
  const activeBalance = cards
    .filter((c) => c.isActive && c.status === GiftCardStatus.ACTIVE)
    .reduce((sum, c) => sum + Number(c.currentBalance || 0), 0);

  // Collect aggregated transactions across all user cards
  const transactions = await prisma.giftCardTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      giftCard: {
        select: {
          code: true,
          nickname: true,
        },
      },
    },
  });

  const primaryCard = cards.length > 0 ? cards[0] : null;

  return {
    cardBalance: activeBalance > 0 ? activeBalance : Number(user.giftCardBalance || 0),
    cardNickname: primaryCard?.nickname || "Morning Ritual Card",
    isCardActive: primaryCard ? primaryCard.isActive : true,
    cards,
    transactions,
  };
};

const redeemGiftCardCode = async (
  userId: string,
  payload: IRedeemGiftCardPayload
) => {
  const rawCode = payload.code.trim().toUpperCase();

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const card = await prisma.giftCard.findFirst({
    where: {
      code: rawCode,
    },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invalid gift card code. Please verify the 16-character code.");
  }

  if (card.status === GiftCardStatus.DEPLETED || Number(card.currentBalance) <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This gift card has already been fully used.");
  }

  if (card.status === GiftCardStatus.INACTIVE || !card.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This gift card is currently inactive or deactivated.");
  }

  if (card.isClaimed && card.userId && card.userId !== user.id) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This gift card has already been claimed by another account."
    );
  }

  const amountToCredit = Number(card.currentBalance);

  const result = await prisma.$transaction(async (tx) => {
    // Link card to current user and mark claimed
    const updatedCard = await tx.giftCard.update({
      where: { id: card.id },
      data: {
        userId: user.id,
        isClaimed: true,
        claimedAt: new Date(),
      },
    });

    // Update user balance
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        giftCardBalance: {
          increment: amountToCredit,
        },
      },
    });

    // Record transaction
    const transaction = await tx.giftCardTransaction.create({
      data: {
        giftCardId: card.id,
        userId: user.id,
        amount: amountToCredit,
        type: GiftCardTxType.REDEMPTION,
        title: "Code Redemption",
        location: "Digital Wallet",
      },
    });

    return {
      updatedCard,
      updatedUser,
      transaction,
    };
  });

  return {
    message: `$${amountToCredit.toFixed(2)} successfully credited to your gift card balance!`,
    card: result.updatedCard,
    newBalance: Number(result.updatedUser.giftCardBalance),
    transaction: result.transaction,
  };
};

const updateGiftCardSettings = async (
  userId: string,
  giftCardId: string,
  payload: IUpdateGiftCardPayload
) => {
  const card = await prisma.giftCard.findFirst({
    where: {
      id: giftCardId,
      userId,
    },
  });

  if (!card) {
    // If not found by giftCardId, allow updating primary card
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
    const primaryCard = await prisma.giftCard.findFirst({
      where: {
        OR: [{ userId: user.id }, { recipientEmail: user.email }],
      },
    });
    if (!primaryCard) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Gift card not found");
    }
    const updated = await prisma.giftCard.update({
      where: { id: primaryCard.id },
      data: payload,
    });
    return updated;
  }

  const updated = await prisma.giftCard.update({
    where: { id: card.id },
    data: payload,
  });

  return updated;
};

const getAllGiftCards = async (
  filters: IGiftCardFilterableFields,
  options: any
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, status, isClaimed, startDate, endDate } = filters;
  const andConditions: Prisma.GiftCardWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { code: { contains: searchTerm, mode: "insensitive" } },
        { recipientName: { contains: searchTerm, mode: "insensitive" } },
        { recipientEmail: { contains: searchTerm, mode: "insensitive" } },
        { nickname: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (typeof isClaimed === "boolean") {
    andConditions.push({ isClaimed });
  }

  if (startDate || endDate) {
    andConditions.push({
      createdAt: {
        gte: startDate ? new Date(startDate) : undefined,
        lte: endDate ? new Date(endDate) : undefined,
      },
    });
  }

  const whereConditions: Prisma.GiftCardWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.giftCard.findMany({
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
        },
      },
      purchaser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const total = await prisma.giftCard.count({
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

const adminAddFunds = async (payload: IAdminAddFundsPayload) => {
  const { giftCardId, userId, email, amount, reason } = payload;

  if (amount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Amount must be greater than 0");
  }

  let targetCard: any = null;
  let targetUser: any = null;

  if (giftCardId) {
    targetCard = await prisma.giftCard.findUnique({
      where: { id: giftCardId },
      include: { user: true },
    });
    if (!targetCard) throw new ApiError(StatusCodes.NOT_FOUND, "Gift card not found");
    if (targetCard.user) targetUser = targetCard.user;
  } else if (userId) {
    targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  } else if (email) {
    targetUser = await prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" } },
    });
    if (!targetUser) throw new ApiError(StatusCodes.NOT_FOUND, `User with email ${email} not found`);
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Must provide giftCardId, userId, or email");
  }

  const result = await prisma.$transaction(async (tx) => {
    let updatedCard = targetCard;
    let updatedUser = targetUser;

    if (targetCard) {
      updatedCard = await tx.giftCard.update({
        where: { id: targetCard.id },
        data: {
          currentBalance: {
            increment: amount,
          },
          status: GiftCardStatus.ACTIVE,
          isActive: true,
        },
      });
    }

    if (targetUser) {
      updatedUser = await tx.user.update({
        where: { id: targetUser.id },
        data: {
          giftCardBalance: {
            increment: amount,
          },
        },
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: targetCard ? targetCard.id : null,
          userId: targetUser.id,
          amount,
          type: GiftCardTxType.ADMIN_ADJUSTMENT,
          title: "Admin Reload / Adjustment",
          location: reason || "Admin Panel",
        },
      });
    }

    return { targetCard: updatedCard, targetUser: updatedUser };
  });

  return {
    message: `Successfully added $${amount.toFixed(2)} to account`,
    card: result.targetCard,
    userBalance: result.targetUser ? Number(result.targetUser.giftCardBalance) : null,
  };
};

const checkBalanceByCode = async (code: string) => {
  const cleanCode = code.trim().toUpperCase();
  const card = await prisma.giftCard.findFirst({
    where: { code: cleanCode },
    select: {
      code: true,
      nickname: true,
      designIndex: true,
      currentBalance: true,
      status: true,
      isActive: true,
      isClaimed: true,
      recipientName: true,
      createdAt: true,
    },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Gift card not found");
  }

  return card;
};

export const GiftCardServices = {
  createGiftCardCheckout,
  getMyGiftCards,
  redeemGiftCardCode,
  updateGiftCardSettings,
  getAllGiftCards,
  adminAddFunds,
  checkBalanceByCode,
};
