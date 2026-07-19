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

const stripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = config.stripe.stripe_webhook_secret;

  let event: Stripe.Event;

  try {
    if (webhookSecret && sig) {
      const rawBody = (req as any).rawBody || req.body;
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } else {
      event = req.body;
    }
  } catch (err: any) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await PaymentServices.confirmPayment(session.id);
  }

  res.status(StatusCodes.OK).json({ received: true });
});

export const PaymentController = {
  stripeWebhook,
  getMyPayments,
  getMyRewardPayments,
  getAllPayments,
  getAllRewardPayments,
};
