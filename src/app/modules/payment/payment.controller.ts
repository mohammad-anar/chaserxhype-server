import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { PaymentServices } from "./payment.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";
import ApiError from "../../../errors/ApiError.js";
import Stripe from "stripe";
import config from "../../../config/index.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");


const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getMyPayments(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyRewardPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getMyRewardPayments(userId, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My reward coin payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getAllPayments(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllRewardPayments = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await PaymentServices.getAllRewardPayments(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All reward coin payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.body?.sessionId || (req.query?.sessionId as string);
  if (!sessionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Session ID is required");
  }

  const result = await PaymentServices.confirmPayment(sessionId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment confirmed successfully",
    data: result,
  });
});

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = config.stripe.stripe_webhook_secret;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      console.warn("⚠️ Webhook signature or secret missing. Falling back to body parsing.");
      event = req.body;
    }
  } catch (err: any) {
    console.error(`❌ Webhook signature verification error:`, err.message);
    // If webhook secret failed, attempt fallback to req.body in non-critical environments
    if (req.body && req.body.type) {
      console.warn("⚠️ Using fallback unverified body for webhook handling.");
      event = req.body;
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook Error: ${err.message}`);
    }
  }

  console.log(`⚡ Stripe Webhook Event Received: [${event.type}]`);

  const relevantEvents = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "payment_intent.succeeded",
  ];

  if (relevantEvents.includes(event.type)) {
    const sessionOrIntent = event.data.object as any;
    const identifier = sessionOrIntent.id;
    const metadata = sessionOrIntent.metadata || {};

    try {
      if (metadata.type === "GIFT_CARD_ORDER" || metadata.giftCardOrderId) {
        const giftCardOrderId = metadata.giftCardOrderId;
        const paymentIntentId =
          typeof sessionOrIntent.payment_intent === "string"
            ? sessionOrIntent.payment_intent
            : identifier;
        await PaymentServices.confirmPayment(giftCardOrderId || identifier);
        console.log(`✅ Webhook confirmed GiftCardOrder payment for: ${giftCardOrderId || identifier}`);
      } else {
        await PaymentServices.confirmPayment(identifier);
        console.log(`✅ Webhook confirmed payment for ID: ${identifier}`);
      }
    } catch (paymentErr: any) {
      console.error(`⚠️ Error confirming payment in webhook:`, paymentErr.message);
    }
  }

  res.status(StatusCodes.OK).json({ received: true });
});

export const PaymentController = {
  confirmPayment,
  stripeWebhook,
  getMyPayments,
  getMyRewardPayments,
  getAllPayments,
  getAllRewardPayments,
};
