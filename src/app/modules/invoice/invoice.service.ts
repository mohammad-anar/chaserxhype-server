import { prisma } from "../../../helpers/prisma.js";
import { Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { emailHelper } from "../../../helpers/emailHelper.js";

/**
 * Sends a structured, styled HTML invoice receipt email to the user.
 */
const sendInvoiceEmail = async (invoice: any) => {
  try {
    const userEmail = invoice.order?.user?.email;
    const userName = invoice.order?.user?.name || "Valued Customer";

    if (!userEmail) {
      console.log(`[Invoice] No user email found for Order #${invoice.orderId}. Skipping email send.`);
      return;
    }

    const itemsRows = (invoice.order?.orderItems || [])
      .map(
        (item: any) => `
        <tr style="border-bottom: 1px solid #3E2723;">
          <td style="padding: 12px 0; color: #FAF6F0;">
            <strong style="color: #FFFFFF;">${item.product?.name || item.name || "Specialty Drink"}</strong>
            ${item.quantity > 1 ? `<span style="color: #C07C4A;"> × ${item.quantity}</span>` : ""}
          </td>
          <td style="padding: 12px 0; text-align: right; color: #EAD8C7; font-weight: 600;">
            $${Number(item.totalPrice || item.basePrice || 0).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #140A07; color: #FAF6F0; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1E0F0B; border: 1px solid #2C1711; border-radius: 20px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #2C1711, #1E0F0B); padding: 32px 24px; text-align: center; border-bottom: 2px solid #C07C4A; }
          .title { font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0; letter-spacing: 0.5px; }
          .subtitle { font-size: 12px; font-weight: 700; color: #C07C4A; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px; }
          .content { padding: 32px 24px; }
          .meta-box { background-color: #140A07; border: 1px solid #2C1711; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; }
          .meta-item { margin-bottom: 8px; }
          .meta-label { font-size: 11px; text-transform: uppercase; color: #8E7E73; font-weight: 700; }
          .meta-val { font-size: 14px; font-weight: 700; color: #FAF6F0; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #A69385; }
          .summary-total { display: flex; justify-content: space-between; padding: 16px 0; font-size: 18px; font-weight: 800; color: #FFFFFF; border-top: 2px solid #3E2723; margin-top: 12px; }
          .footer { padding: 24px; text-align: center; font-size: 12px; color: #8E7E73; border-top: 1px solid #2C1711; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">☕ Bean Fien Coffee</h1>
            <p class="subtitle">Official Order Invoice & Receipt</p>
          </div>
          <div class="content">
            <p style="font-size: 15px; color: #EAD8C7; margin-top: 0;">Hello <strong>${userName}</strong>,</p>
            <p style="font-size: 13px; color: #A69385; line-height: 1.5;">Thank you for your order! Your coffee order is being freshly prepared by our baristas. Here is your official invoice receipt.</p>
            
            <div style="background-color: #140A07; border: 1px solid #2C1711; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="color: #8E7E73; font-weight: 700;">Invoice Number:</td>
                  <td style="text-align: right; color: #C07C4A; font-weight: 800;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #8E7E73; font-weight: 700;">Order Number:</td>
                  <td style="text-align: right; color: #FFFFFF; font-weight: 700;">${invoice.order?.orderNumber || invoice.orderId}</td>
                </tr>
                <tr>
                  <td style="color: #8E7E73; font-weight: 700;">Status:</td>
                  <td style="text-align: right; color: #10B981; font-weight: 700;">${invoice.status || "ISSUED"}</td>
                </tr>
              </table>
            </div>

            <table class="table">
              <thead>
                <tr style="border-bottom: 2px solid #3E2723; text-align: left;">
                  <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #8E7E73;">Item Description</th>
                  <th style="padding-bottom: 8px; font-size: 11px; text-transform: uppercase; color: #8E7E73; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div style="background-color: #140A07; border: 1px solid #2C1711; border-radius: 12px; padding: 16px;">
              <table style="width: 100%; font-size: 13px;">
                <tr>
                  <td style="color: #A69385; padding: 4px 0;">Subtotal:</td>
                  <td style="text-align: right; color: #FAF6F0;">$${Number(invoice.subTotal || 0).toFixed(2)}</td>
                </tr>
                ${
                  Number(invoice.deliveryFee || 0) > 0
                    ? `<tr>
                        <td style="color: #A69385; padding: 4px 0;">Delivery Fee:</td>
                        <td style="text-align: right; color: #FAF6F0;">$${Number(invoice.deliveryFee).toFixed(2)}</td>
                      </tr>`
                    : ""
                }
                ${
                  Number(invoice.taxAmount || 0) > 0
                    ? `<tr>
                        <td style="color: #A69385; padding: 4px 0;">Tax:</td>
                        <td style="text-align: right; color: #FAF6F0;">$${Number(invoice.taxAmount).toFixed(2)}</td>
                      </tr>`
                    : ""
                }
                ${
                  Number(invoice.discount || 0) > 0
                    ? `<tr>
                        <td style="color: #10B981; padding: 4px 0;">Discount:</td>
                        <td style="text-align: right; color: #10B981;">-$${Number(invoice.discount).toFixed(2)}</td>
                      </tr>`
                    : ""
                }
                <tr style="border-top: 1px solid #2C1711;">
                  <td style="color: #FFFFFF; font-size: 16px; font-weight: 800; padding-top: 12px;">Total Paid:</td>
                  <td style="text-align: right; color: #C07C4A; font-size: 18px; font-weight: 800; padding-top: 12px;">$${Number(invoice.total || 0).toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">Bean Fien Artisan Coffee Roastery</p>
            <p style="margin: 0; font-size: 11px; color: #6E5D53;">Crafted with passion. If you have questions about your order, reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await emailHelper.sendEmail({
      to: userEmail,
      subject: `☕ Order Invoice Receipt #${invoice.invoiceNumber} - Bean Fien`,
      html: htmlContent,
    });

    console.log(`[Invoice] Successfully sent invoice email #${invoice.invoiceNumber} to ${userEmail}`);
  } catch (err: any) {
    console.error(`[Invoice] Error sending invoice email:`, err?.message || err);
  }
};

/**
 * Deterministically calculates and creates an invoice for an order.
 * Strictly idempotent: If invoice already exists for orderId, returns existing invoice.
 */
const generateInvoice = async (
  orderId: string,
  txClient?: Prisma.TransactionClient
) => {
  let createdNew = false;

  const runInTx = async (tx: Prisma.TransactionClient) => {
    // 1. Check if invoice already exists (Idempotency)
    const existing = await tx.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            orderItems: {
              include: {
                product: true,
                orderItemExtras: { include: { productExtra: true } },
              },
            },
            shippingAddress: true,
          },
        },
      },
    });

    if (existing) {
      return existing;
    }

    // 2. Fetch order with items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: {
          include: {
            product: true,
            orderItemExtras: true,
          },
        },
      },
    });

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Order #${orderId} not found`);
    }

    // 3. Deterministic calculation
    const subTotal = Number(order.subTotal || 0);
    const taxAmount = Number(order.taxAmount || 0);
    const discount = Number(order.discount || 0);
    const deliveryFee = Number(order.deliveryFee || 0);
    const serviceCharge = Number(order.serviceCharge || 0);

    const calculatedTotal = Number(
      (subTotal + taxAmount + deliveryFee + serviceCharge - discount).toFixed(2)
    );

    const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const isPaid = order.paymentStatus === "PAID";

    const invoice = await tx.invoice.upsert({
      where: { orderId },
      update: {
        status: isPaid ? "PAID" : undefined,
      },
      create: {
        orderId,
        invoiceNumber,
        subTotal: isNaN(subTotal) ? 0 : subTotal,
        taxAmount: isNaN(taxAmount) ? 0 : taxAmount,
        discount: isNaN(discount) ? 0 : discount,
        deliveryFee: isNaN(deliveryFee) ? 0 : deliveryFee,
        serviceCharge: isNaN(serviceCharge) ? 0 : serviceCharge,
        total: !isNaN(calculatedTotal) && calculatedTotal > 0 ? calculatedTotal : (Number(order.total || 0) || 0),
        status: isPaid ? "PAID" : "ISSUED",
      },
      include: {
        order: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            orderItems: {
              include: {
                product: true,
                orderItemExtras: { include: { productExtra: true } },
              },
            },
            shippingAddress: true,
          },
        },
      },
    });

    createdNew = true;
    return invoice;
  };

  const invoice = txClient
    ? await runInTx(txClient)
    : await prisma.$transaction(async (tx) => await runInTx(tx), {
        maxWait: 20000,
        timeout: 60000,
      });

  // Send email only when called standalone (without txClient).
  // When called with txClient, the caller must send the email AFTER the outer transaction commits
  // to avoid emailing for invoices that may be rolled back.
  if (!txClient && createdNew && invoice) {
    sendInvoiceEmail(invoice).catch((err) =>
      console.error("[Invoice] Async email error:", err)
    );
  }

  return invoice;
};

const getInvoiceByOrderId = async (orderId: string, userId?: string, userRole?: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          orderItems: {
            include: {
              product: true,
              selectedSize: true,
              selectedMilk: true,
              orderItemExtras: { include: { productExtra: true } },
            },
          },
          shippingAddress: true,
          assignedBarista: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!invoice) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Invoice not found for this order");
  }

  if (userRole !== "ADMIN" && userRole !== "BARISTA" && userId && invoice.order.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to view this invoice");
  }

  return invoice;
};

const getAllInvoices = async (options: any) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);

  const result = await prisma.invoice.findMany({
    skip,
    take: limit,
    orderBy: {
      [sortBy || "createdAt"]: sortOrder || "desc",
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  const total = await prisma.invoice.count();

  return {
    meta: { page, limit, total },
    data: result,
  };
};

export const InvoiceServices = {
  generateInvoice,
  getInvoiceByOrderId,
  getAllInvoices,
  sendInvoiceEmail,
};
