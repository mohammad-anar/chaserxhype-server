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
    throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  console.log(`⚡ Stripe Webhook Event Received: [${event.type}]`);

  if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
    const sessionOrIntent = event.data.object as any;
    const sessionId = sessionOrIntent.id;
    try {
      await PaymentServices.confirmPayment(sessionId);
      console.log(`✅ Webhook confirmed payment for ID: ${sessionId}`);
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
