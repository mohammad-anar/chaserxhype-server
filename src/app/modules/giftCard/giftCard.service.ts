import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { GiftCardStatus, GiftCardTxType, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import Stripe from "stripe";
import config from "../../../config/index.js";
import {
  ICreateGiftCardPayload,
  ICreateGiftCardOrderPayload,
  IRedeemGiftCardPayload,
  IUpdateGiftCardPayload,
  IAdminAddFundsPayload,
  IGiftCardFilterableFields,
  IGiftCardOrderFilterableFields,
} from "./giftCard.interface.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");

const generateGiftCardCode = () => {
  const segment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GC-${segment()}-${segment()}-${segment()}`;
};

/**
 * Creates a GiftCardOrder in PENDING payment status and generates a Stripe Checkout session.
 * Used for direct purchasing gift cards for another recipient.
 */
const createGiftCardOrderCheckout = async (
  purchaserId: string | null,
  payload: ICreateGiftCardOrderPayload
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
  const orderNumber = `GCO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const cardNickname = nickname || `${recipientName.trim()}'s Coffee Pass`;

  // 1. Create GiftCardOrder in PENDING status
  const giftCardOrder = await prisma.giftCardOrder.create({
    data: {
      orderNumber,
      amount,
      recipientName: recipientName.trim(),
      recipientEmail: normalizedEmail,
      personalMessage: personalMessage ? personalMessage.trim() : null,
      designIndex: designIndex || 0,
      nickname: cardNickname,
      orderStatus: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      purchaserId: purchaserId || null,
    },
  });

  // 2. Generate Stripe Checkout session
  let paymentUrl: string | null = null;
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  if (config.stripe.stripe_secret_key) {
    try {
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
        success_url: `${frontendUrl}/gift-cards?status=success&orderId=${giftCardOrder.id}`,
        cancel_url: `${frontendUrl}/gift-cards?status=cancelled&orderId=${giftCardOrder.id}`,
        metadata: {
          type: "GIFT_CARD_ORDER",
          giftCardOrderId: giftCardOrder.id,
          orderNumber: giftCardOrder.orderNumber,
          amount: amount.toString(),
          recipientEmail: normalizedEmail,
          recipientName: recipientName.trim(),
        },
      });

      paymentUrl = session.url;

      // Update order with stripe session ID
      await prisma.giftCardOrder.update({
        where: { id: giftCardOrder.id },
        data: {
          stripeSessionId: session.id,
        },
      });
    } catch (err) {
      console.warn("Stripe session creation note:", err);
    }
  }

  return {
    order: giftCardOrder,
    paymentUrl,
    message: "Gift card order created. Please complete payment to issue card.",
  };
};

/**
 * Confirms payment for a GiftCardOrder (via Stripe Webhook or direct confirm)
 * Issues the active GiftCard, credits recipient if registered, creates notifications & transactions.
 */
const confirmGiftCardOrderPayment = async (
  sessionId: string,
  paymentIntentId?: string
) => {
  console.log(`🎁 Confirming GiftCardOrder payment for session: ${sessionId}`);

  // 1. Find the GiftCardOrder by stripeSessionId or lookup by metadata
  let order = await prisma.giftCardOrder.findFirst({
    where: { stripeSessionId: sessionId },
    include: {
      giftCard: true,
      purchaser: true,
    },
  });

  if (!order) {
    // Try to retrieve session from stripe
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session?.metadata?.giftCardOrderId) {
        order = await prisma.giftCardOrder.findUnique({
          where: { id: session.metadata.giftCardOrderId },
          include: {
            giftCard: true,
            purchaser: true,
          },
        });
      }
    } catch (e: any) {
      console.error("Failed to retrieve Stripe session for GiftCardOrder:", e.message);
    }
  }

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, `GiftCardOrder not found for session ID: ${sessionId}`);
  }

  // If already PAID, return order immediately
  if (order.paymentStatus === PaymentStatus.PAID && order.giftCard) {
    console.log(`✅ GiftCardOrder ${order.orderNumber} is already marked as PAID.`);
    return order;
  }

  const normalizedEmail = order.recipientEmail.toLowerCase();
  const code = generateGiftCardCode();
  const purchaserName = order.purchaser?.name || "A friend";

  // 2. Execute atomic fulfillment transaction
  const result = await prisma.$transaction(async (tx) => {
    // Check if recipient is a registered user
    const recipientUser = await tx.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        isDeleted: false,
      },
    });

    // Create active GiftCard record
    const giftCard = await tx.giftCard.create({
      data: {
        code,
        nickname: order.nickname || `${order.recipientName}'s Coffee Pass`,
        designIndex: order.designIndex,
        initialAmount: order.amount,
        currentBalance: order.amount,
        status: GiftCardStatus.ACTIVE,
        isActive: true,
        recipientName: order.recipientName,
        recipientEmail: normalizedEmail,
        personalMessage: order.personalMessage,
        purchaserId: order.purchaserId,
        userId: recipientUser ? recipientUser.id : null,
        isClaimed: recipientUser ? true : false,
        claimedAt: recipientUser ? new Date() : null,
      },
    });

    // If recipient is a registered user, auto-credit their balance and notify them
    if (recipientUser) {
      // Credit recipient's giftCardBalance
      await tx.user.update({
        where: { id: recipientUser.id },
        data: {
          giftCardBalance: {
            increment: order.amount,
          },
        },
      });

      // Log transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          userId: recipientUser.id,
          amount: order.amount,
          type: GiftCardTxType.PURCHASE,
          title: `Gift Card Received from ${purchaserName}`,
          location: "Online",
        },
      });

      // Create in-app Notification for recipient
      await tx.notification.create({
        data: {
          userId: recipientUser.id,
          title: "🎁 You received a Bean Fien Gift Card!",
          message: `${purchaserName} sent you a $${Number(order.amount).toFixed(2)} gift card: "${order.personalMessage || 'Enjoy your coffee!'}". Code: ${code}`,
          type: "GIFT_CARD_RECEIVED",
        },
      });
    }

    // Create in-app Notification for purchaser if purchaser is logged in
    if (order.purchaserId) {
      await tx.notification.create({
        data: {
          userId: order.purchaserId,
          title: "✨ Gift Card Sent Successfully",
          message: `Your $${Number(order.amount).toFixed(2)} gift card for ${order.recipientName} (${order.recipientEmail}) was successfully paid and delivered.`,
          type: "GIFT_CARD_PURCHASED",
        },
      });
    }

    // Update GiftCardOrder status to PAID & COMPLETED
    const updatedOrder = await tx.giftCardOrder.update({
      where: { id: order.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.COMPLETED,
        stripePaymentIntentId: paymentIntentId || null,
        giftCardId: giftCard.id,
      },
      include: {
        giftCard: true,
        purchaser: true,
      },
    });

    return updatedOrder;
  });

  console.log(`✅ GiftCardOrder ${order.orderNumber} successfully fulfilled! Card code: ${code}`);
  return result;
};

/**
 * Get a single gift card order by ID (used for live status polling on frontend)
 */
const getGiftCardOrderById = async (id: string) => {
  const order = await prisma.giftCardOrder.findUnique({
    where: { id },
    include: {
      giftCard: {
        select: {
          id: true,
          code: true,
          nickname: true,
          designIndex: true,
          initialAmount: true,
          currentBalance: true,
          status: true,
          isActive: true,
          isClaimed: true,
          recipientName: true,
          recipientEmail: true,
        },
      },
      purchaser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Gift card order not found");
  }

  return order;
};

/**
 * Get gift card orders placed by current user
 */
const getMyGiftCardOrders = async (userId: string, paginationOptions: any) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions);

  const [orders, total] = await Promise.all([
    prisma.giftCardOrder.findMany({
      where: { purchaserId: userId },
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        giftCard: true,
      },
    }),
    prisma.giftCardOrder.count({
      where: { purchaserId: userId },
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: orders,
  };
};

/**
 * Admin: Get all gift card orders with search, filters & pagination
 */
const getAllGiftCardOrders = async (
  filters: IGiftCardOrderFilterableFields,
  paginationOptions: any
) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions);
  const { searchTerm, paymentStatus, orderStatus, startDate, endDate } = filters;

  const andConditions: Prisma.GiftCardOrderWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { orderNumber: { contains: searchTerm, mode: "insensitive" } },
        { recipientName: { contains: searchTerm, mode: "insensitive" } },
        { recipientEmail: { contains: searchTerm, mode: "insensitive" } },
        { purchaser: { name: { contains: searchTerm, mode: "insensitive" } } },
        { purchaser: { email: { contains: searchTerm, mode: "insensitive" } } },
        { giftCard: { code: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (paymentStatus) {
    andConditions.push({ paymentStatus });
  }

  if (orderStatus) {
    andConditions.push({ orderStatus });
  }

  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    andConditions.push({ createdAt: dateFilter });
  }

  const whereConditions: Prisma.GiftCardOrderWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [orders, total] = await Promise.all([
    prisma.giftCardOrder.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        purchaser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        giftCard: true,
      },
    }),
    prisma.giftCardOrder.count({
      where: whereConditions,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: orders,
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
    throw new ApiError(StatusCodes.NOT_FOUND, "Invalid gift card code. Please verify the code.");
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

    // Create redemption transaction
    await tx.giftCardTransaction.create({
      data: {
        giftCardId: card.id,
        userId: user.id,
        amount: amountToCredit,
        type: GiftCardTxType.REDEMPTION,
        title: "Gift Card Code Redeemed",
        location: "Online",
      },
    });

    return { card: updatedCard, user: updatedUser };
  });

  return {
    message: `Successfully redeemed $${amountToCredit.toFixed(2)} to your account balance!`,
    claimedAmount: amountToCredit,
    newBalance: Number(result.user.giftCardBalance),
    card: result.card,
  };
};

const updateGiftCardSettings = async (
  userId: string,
  cardId: string,
  payload: IUpdateGiftCardPayload
) => {
  const card = await prisma.giftCard.findUnique({
    where: { id: cardId },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Gift card not found");
  }

  if (card.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to manage this gift card");
  }

  const updatedCard = await prisma.giftCard.update({
    where: { id: cardId },
    data: {
      nickname: payload.nickname !== undefined ? payload.nickname : card.nickname,
      isActive: payload.isActive !== undefined ? payload.isActive : card.isActive,
    },
  });

  return updatedCard;
};

const getAllGiftCards = async (
  filters: IGiftCardFilterableFields,
  paginationOptions: any
) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(paginationOptions);
  const { searchTerm, status, isClaimed, startDate, endDate } = filters;

  const andConditions: Prisma.GiftCardWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { code: { contains: searchTerm, mode: "insensitive" } },
        { recipientName: { contains: searchTerm, mode: "insensitive" } },
        { recipientEmail: { contains: searchTerm, mode: "insensitive" } },
        { nickname: { contains: searchTerm, mode: "insensitive" } },
        { purchaser: { name: { contains: searchTerm, mode: "insensitive" } } },
        { purchaser: { email: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  if (isClaimed !== undefined) {
    andConditions.push({ isClaimed });
  }

  if (startDate || endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    andConditions.push({ createdAt: dateFilter });
  }

  const whereConditions: Prisma.GiftCardWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const [result, total] = await Promise.all([
    prisma.giftCard.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        purchaser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.giftCard.count({
      where: whereConditions,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
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
  createGiftCardOrderCheckout,
  confirmGiftCardOrderPayment,
  getGiftCardOrderById,
  getMyGiftCardOrders,
  getAllGiftCardOrders,
  getMyGiftCards,
  redeemGiftCardCode,
  updateGiftCardSettings,
  getAllGiftCards,
  adminAddFunds,
  checkBalanceByCode,
};
