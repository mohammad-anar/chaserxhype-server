import { prisma } from "../../../helpers/prisma.js";
import { InventoryServices } from "../inventory/inventory.service.js";
import { BaristaServices } from "../barista/barista.service.js";
import { InvoiceServices } from "../invoice/invoice.service.js";
import { emitOrderNotification } from "../../../helpers/socketHelper.js";
import colors from "colors";

// Tracks whether a brand-new invoice was created so we can email AFTER the outer tx commits
let _newInvoiceForEmail: any = null;

export interface IAutomationResult {
  orderId: string;
  success: boolean;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  step: string;
  error?: string;
  details?: {
    reservedIngredients?: any[];
    assignedBarista?: string;
    invoiceNumber?: string;
  };
}

/**
 * Executes the complete deterministic order automation workflow.
 * Idempotent, transaction-safe, and log-traceable.
 */
const processOrderAutomation = async (orderId: string): Promise<IAutomationResult> => {
  const startedAt = new Date();
  console.log(colors.cyan(`⚡ [Automation] Starting automation pipeline for Order #${orderId}`));

  // 1. Check order existence and status
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          product: true,
          orderItemExtras: true,
        },
      },
      user: true,
      invoice: true,
      assignedBarista: true,
    },
  });

  if (!order) {
    console.error(colors.red(`❌ [Automation] Order #${orderId} not found`));
    return {
      orderId,
      success: false,
      status: "FAILED",
      step: "VALIDATE_ORDER",
      error: "Order not found in database",
    };
  }

  // Idempotency: If order is already completed, canceled, or refunded, skip processing
  if (
    order.status === "COMPLETED" ||
    order.status === "CANCELED" ||
    order.status === "REFUNDED"
  ) {
    console.log(colors.yellow(`⚠️ [Automation] Order #${orderId} has status '${order.status}'. Skipping automation.`));
    return {
      orderId,
      success: true,
      status: "SKIPPED",
      step: "VALIDATE_ORDER",
    };
  }

  // Create initial automation log
  const log = await prisma.orderAutomationLog.create({
    data: {
      orderId,
      jobType: "PROCESS_ORDER",
      status: "PROCESSING",
      step: "INVENTORY_CHECK",
      startedAt,
    },
  });

  // Calculate required ingredients outside the transaction to reduce tx duration
  const requiredIngredients = await InventoryServices.calculateRequiredIngredients(
    order.orderItems
  );

  if (requiredIngredients.length > 0) {
    const availability = await InventoryServices.checkStockAvailability(requiredIngredients);
    if (!availability.available) {
      const missingDetails = availability.missingIngredients
        .map(
          (m) =>
            `${m.name}: needed ${m.required}${m.unit}, available ${m.availableStock}${m.unit}`
        )
        .join("; ");

      const errMsg = `Insufficient stock: ${missingDetails}`;

      await prisma.order.update({
        where: { id: orderId },
        data: { status: "FAILED" },
      });

      await prisma.orderAutomationLog.update({
        where: { id: log.id },
        data: {
          status: "FAILED",
          step: "INVENTORY_CHECK",
          error: errMsg,
          completedAt: new Date(),
        },
      });

      throw new Error(errMsg);
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ==========================================
        // STEP 1 & 2: RESERVE INGREDIENTS
        // ==========================================
        if (requiredIngredients.length > 0) {
          await InventoryServices.reserveStock(orderId, requiredIngredients, tx);
        }

        // ==========================================
        // STEP 3: ASSIGN BARISTA
        // Only assign if checkout didn't already assign one (avoids redundant tx work)
        // ==========================================
        let baristaAssignment: any;
        if (order.assignedBaristaId) {
          baristaAssignment = {
            assigned: true,
            alreadyAssigned: true,
            baristaId: order.assignedBaristaId,
            baristaName: order.assignedBarista?.name,
          };
        } else {
          baristaAssignment = await BaristaServices.assignBaristaToOrder(
            orderId,
            undefined,
            tx
          );
        }

        // ==========================================
        // STEP 4: GENERATE INVOICE
        // Note: sendInvoiceEmail is called AFTER this $transaction commits (see below)
        // ==========================================
        const invoice = await InvoiceServices.generateInvoice(orderId, tx);
        _newInvoiceForEmail = invoice;

        // ==========================================
        // STEP 5: UPDATE ORDER STATUS
        // ==========================================
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            status: "PREPARING",
            paymentStatus:
              order.paymentStatus === "PENDING" && order.paymentMethod === "REWARD_COINS"
                ? "PAID"
                : order.paymentStatus,
          },
          include: {
            user: true,
            orderItems: { include: { product: true } },
            assignedBarista: true,
          },
        });

        // Update log to COMPLETED
        await tx.orderAutomationLog.update({
          where: { id: log.id },
          data: {
            status: "COMPLETED",
            step: "ORDER_PREPARING",
            completedAt: new Date(),
            metadata: {
              assignedBaristaId: baristaAssignment.baristaId,
              baristaName: baristaAssignment.baristaName,
              invoiceNumber: invoice.invoiceNumber,
              reservedIngredientsCount: requiredIngredients.length,
            },
          },
        });

        return {
          order: updatedOrder,
          baristaAssignment,
          invoice,
          requiredIngredients,
        };
      },
      {
        maxWait: 20000,
        timeout: 60000,
      }
    );

    // ==========================================
    // STEP 6: NOTIFY + SEND INVOICE EMAIL (Post-Transaction — safe to do after commit)
    // ==========================================
    // Send invoice email now that the $transaction has committed successfully
    if (_newInvoiceForEmail) {
      InvoiceServices.sendInvoiceEmail(_newInvoiceForEmail).catch((err: any) =>
        console.error(colors.red(`[Automation] Invoice email error: ${err?.message}`))
      );
      _newInvoiceForEmail = null;
    }

    try {
      await emitOrderNotification({
        type: "ORDER_STATUS_CHANGED",
        order: result.order,
        message: `Order #${order.orderNumber} is now PREPARING! Assigned to Barista: ${
          result.baristaAssignment.baristaName || "Store Barista"
        }. Invoice #${result.invoice.invoiceNumber} generated.`,
      });
    } catch (notifErr: any) {
      console.warn(colors.yellow(`⚠️ Notification emission notice: ${notifErr.message}`));
    }

    console.log(
      colors.green(
        `✅ [Automation] Order #${orderId} processed successfully -> PREPARING (Barista: ${
          result.baristaAssignment.baristaName || "Assigned"
        }, Invoice: ${result.invoice.invoiceNumber})`
      )
    );

    return {
      orderId,
      success: true,
      status: "COMPLETED",
      step: "ORDER_PREPARING",
      details: {
        reservedIngredients: result.requiredIngredients,
        assignedBarista: result.baristaAssignment.baristaName,
        invoiceNumber: result.invoice.invoiceNumber,
      },
    };
  } catch (err: any) {
    console.error(colors.red(`❌ [Automation] Automation failed for Order #${orderId}: ${err.message}`));

    // Log failure record outside transaction if tx rolled back
    try {
      await prisma.orderAutomationLog.upsert({
        where: { id: log.id },
        update: {
          status: "FAILED",
          error: err.message,
          completedAt: new Date(),
        },
        create: {
          orderId,
          jobType: "PROCESS_ORDER",
          status: "FAILED",
          step: "FAILED",
          error: err.message,
          completedAt: new Date(),
        },
      });

      // Emit status update for failed order
      await emitOrderNotification({
        type: "ORDER_STATUS_CHANGED",
        order: { id: orderId, userId: order.userId, status: "FAILED" },
        message: `Order #${order.orderNumber} automation issue: ${err.message}. Our staff has been alerted.`,
      });
    } catch (cleanupErr) {
      // Ignore secondary error logging issues
    }

    return {
      orderId,
      success: false,
      status: "FAILED",
      step: "AUTOMATION_EXECUTION",
      error: err.message,
    };
  }
};

/**
 * Gets automation logs and current automation status for an order.
 */
const getOrderAutomationStatus = async (orderId: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      assignedBarista: {
        select: { id: true, name: true, email: true, station: true },
      },
      invoice: true,
      automationLogs: {
        orderBy: { startedAt: "desc" },
      },
      stockMovements: {
        include: {
          ingredient: { select: { name: true, unit: true } },
        },
      },
    },
  });

  return order;
};

/**
 * Manual retry for a failed order automation.
 */
const retryOrderAutomation = async (orderId: string) => {
  return await processOrderAutomation(orderId);
};

export const AutomationServices = {
  processOrderAutomation,
  getOrderAutomationStatus,
  retryOrderAutomation,
};
