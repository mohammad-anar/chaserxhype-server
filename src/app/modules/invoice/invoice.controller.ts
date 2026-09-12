import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { InvoiceServices } from "./invoice.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";

const generateInvoice = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const result = await InvoiceServices.generateInvoice(orderId);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Invoice generated successfully",
    data: result,
  });
});

const getInvoiceByOrderId = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.orderId as string;
  const userId = req.user?.id as string | undefined;
  const userRole = req.user?.role as string | undefined;
  const result = await InvoiceServices.getInvoiceByOrderId(orderId, userId, userRole);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoice retrieved successfully",
    data: result,
  });
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await InvoiceServices.getAllInvoices(options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Invoices retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const InvoiceController = {
  generateInvoice,
  getInvoiceByOrderId,
  getAllInvoices,
};
