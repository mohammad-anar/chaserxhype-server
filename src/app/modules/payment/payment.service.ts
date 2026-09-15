import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import Stripe from "stripe";
import config from "../../../config/index.js";
import { enqueueOrderAutomation } from "../../../queues/order.queue.js";

import { GiftCardServices } from "../giftCard/giftCard.service.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");

const confirmPayment = async (sessionIdOrId: string) => {
  console.log(`🔍 Confirming Stripe payment for: ${sessionIdOrId}`);

  // 1. Check if identifier is directly a GiftCardOrder ID
  const directGiftCardOrder = await prisma.giftCardOrder.findUnique({
    where: { id: sessionIdOrId },
  });
  if (directGiftCardOrder) {
    return await GiftCardServices.confirmGiftCardOrderPayment(directGiftCardOrder.stripeSessionId || sessionIdOrId);
  }

  // 2. Check if a GiftCardOrder exists with stripeSessionId or stripePaymentIntentId
  const matchedGiftCardOrder = await prisma.giftCardOrder.findFirst({
    where: {
      OR: [
        { stripeSessionId: sessionIdOrId },
        { stripePaymentIntentId: sessionIdOrId },
      ],
    },
  });
  if (matchedGiftCardOrder) {
    return await GiftCardServices.confirmGiftCardOrderPayment(sessionIdOrId);
  }

  // 3. Inspect Stripe Session or PaymentIntent
  let session: Stripe.Checkout.Session | null = null;
  if (sessionIdOrId.startsWith("cs_")) {
    try {
      session = await stripe.checkout.sessions.retrieve(sessionIdOrId);
    } catch (err: any) {
      console.warn(`Could not retrieve Stripe session ${sessionIdOrId}:`, err.message);
    }

    if (session?.metadata?.type === "GIFT_CARD_ORDER" || session?.metadata?.giftCardOrderId) {
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.id;
      return await GiftCardServices.confirmGiftCardOrderPayment(sessionIdOrId, paymentIntentId);
    }
  } else if (sessionIdOrId.startsWith("pi_")) {
    try {
      const pi = await stripe.paymentIntents.retrieve(sessionIdOrId);
      if (pi?.metadata?.type === "GIFT_CARD_ORDER" || pi?.metadata?.giftCardOrderId) {
        return await GiftCardServices.confirmGiftCardOrderPayment(sessionIdOrId, sessionIdOrId);
      }
    } catch (err: any) {
      console.warn(`Could not retrieve Stripe PaymentIntent ${sessionIdOrId}:`, err.message);
    }
  }

  // 4. Find Payment record by gatewayPaymentId or orderId in metadata
  let paymentRecord = await prisma.payment.findFirst({
    where: {
      OR: [
        { gatewayPaymentId: sessionIdOrId },
        { transactionId: sessionIdOrId },
      ],
    },
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

  if (!paymentRecord && session?.metadata?.orderId) {
    console.log(`ℹ️ Lookup by gatewayPaymentId failed; attempting lookup by metadata.orderId: ${session.metadata.orderId}`);
    paymentRecord = await prisma.payment.findFirst({
      where: { orderId: session.metadata.orderId },
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
  }

  if (!paymentRecord) {
    throw new ApiError(StatusCodes.NOT_FOUND, `Payment record not found for ID: ${sessionIdOrId}`);
  }

  // If already PAID, just return the order details immediately
  if (paymentRecord.status === "PAID") {
    console.log(`✅ Payment record ${paymentRecord.id} is already marked as PAID.`);
    return await prisma.order.findUnique({
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

  if (!session && sessionIdOrId.startsWith("cs_")) {
    session = await stripe.checkout.sessions.retrieve(sessionIdOrId);
  }

  if (session && session.payment_status !== "paid" && session.status !== "complete") {
    if (session.status === "expired") {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: "FAILED", failureReson: "Session expired" },
      });
      await prisma.order.update({
        where: { id: paymentRecord.orderId },
        data: { status: "FAILED", paymentStatus: "FAILED" },
      });
    }
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Payment has not been completed. Status: ${session.payment_status}`
    );
  }

  // 3. Mark Payment & Order as PAID inside atomic transaction with extended timeout
  const result = await prisma.$transaction(
    async (tx) => {
      const paymentIntentId =
        session && typeof session.payment_intent === "string"
          ? session.payment_intent
          : session?.id || sessionIdOrId;

      await tx.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: "PAID",
          transactionId: paymentIntentId,
          gateWayPaymentResponse: session ? JSON.stringify(session) : JSON.stringify({ id: sessionIdOrId }),
          paidAt: new Date(),
        },
      });

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

      // Credit earnedCoin to the user's Wallet balance
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
    },
    {
      maxWait: 20000,
      timeout: 60000,
    }
  );

  // Trigger BullMQ Order Automation post-transaction
  if (result && result.id) {
    enqueueOrderAutomation(result.id).catch((err) => {
      console.error("Failed to enqueue order automation on payment confirmation:", err);
    });
  }

  return result;
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
      order: {
        include: {
          orderItems: {
            include: {
              coinProduct: {
                include: {
                  product: true,
                },
              },
              product: true,
            },
          },
        },
      },
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
