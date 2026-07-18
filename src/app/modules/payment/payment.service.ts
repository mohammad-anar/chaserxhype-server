import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import Stripe from "stripe";
import config from "../../../config/index.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");

const confirmPayment = async (sessionId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Find the Payment record associated with the Stripe Session ID
    const paymentRecord = await tx.payment.findFirst({
      where: { gatewayPaymentId: sessionId },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!paymentRecord) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Payment record not found for the given session ID");
    }

    // If already PAID, just return the order details
    if (paymentRecord.status === "PAID") {
      return await tx.order.findUnique({
        where: { id: paymentRecord.orderId },
        include: {
          orderItems: {
            include: {
              orderItemExtras: {
                include: {
                  productExtra: true,
                },
              },
              product: true,
              coinProduct: true,
            },
          },
          payments: true,
          rewardPayments: true,
        },
      });
    }

    // 2. Query Stripe Checkout Sessions to verify payment completion
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      if (session.status === "expired") {
        await tx.payment.update({
          where: { id: paymentRecord.id },
          data: { status: "FAILED", failureReson: "Session expired" },
        });
        await tx.order.update({
          where: { id: paymentRecord.orderId },
          data: { status: "FAILED", paymentStatus: "FAILED" },
        });
      }
      throw new ApiError(StatusCodes.BAD_REQUEST, `Payment has not been completed. Status: ${session.payment_status}`);
    }

    // 3. Mark Payment record as PAID
    const paymentIntentId = typeof session.payment_intent === "string" 
      ? session.payment_intent 
      : session.id;

    await tx.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "PAID",
        transactionId: paymentIntentId,
        gateWayPaymentResponse: JSON.stringify(session),
        paidAt: new Date(),
      },
    });

    // 4. Mark Order status as CONFIRMED and paymentStatus as PAID
    const updatedOrder = await tx.order.update({
      where: { id: paymentRecord.orderId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
      include: {
        orderItems: true,
      },
    });

    // 5. Credit earnedCoin to the user's Wallet balance
    const earnedCoin = updatedOrder.earnedCoin ? Number(updatedOrder.earnedCoin) : 0;
    if (earnedCoin > 0) {
      let wallet = await tx.wallet.findFirst({
        where: { userId: paymentRecord.userId },
      });

      if (!wallet) {
        await tx.wallet.create({
          data: {
            userId: paymentRecord.userId,
            balance: earnedCoin,
          },
        });
      } else {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: earnedCoin,
            },
          },
        });
      }
    }

    // 6. Return the finalized order with its payment records
    return await tx.order.findUnique({
      where: { id: paymentRecord.orderId },
      include: {
        orderItems: {
          include: {
            orderItemExtras: {
              include: {
                productExtra: true,
              },
            },
            product: true,
            coinProduct: true,
          },
        },
        payments: true,
        rewardPayments: true,
      },
    });
  });
};

const getMyPayments = async (userId: string, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.payment.findMany({
    where: { userId },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      order: true,
    },
  });

  const total = await prisma.payment.count({ where: { userId } });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getMyRewardPayments = async (userId: string, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.rewardPayment.findMany({
    where: { userId },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      order: true,
    },
  });

  const total = await prisma.rewardPayment.count({ where: { userId } });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getAllPayments = async (options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.payment.findMany({
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
      order: true,
    },
  });

  const total = await prisma.payment.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getAllRewardPayments = async (options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.rewardPayment.findMany({
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
      order: true,
    },
  });

  const total = await prisma.rewardPayment.count();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

export const PaymentServices = {
  confirmPayment,
  getMyPayments,
  getMyRewardPayments,
  getAllPayments,
  getAllRewardPayments,
};
