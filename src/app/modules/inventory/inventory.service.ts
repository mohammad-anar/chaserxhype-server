import { prisma } from "../../../helpers/prisma.js";
import { Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";

export interface IRequiredIngredient {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
}

export interface IStockAvailabilityResult {
  available: boolean;
  requiredIngredients: IRequiredIngredient[];
  missingIngredients: {
    ingredientId: string;
    name: string;
    required: number;
    availableStock: number;
    unit: string;
  }[];
}

/**
 * Calculates deterministic total required ingredients from an order's items.
 */
const calculateRequiredIngredients = async (
  orderItems: Array<{
    productId?: string | null;
    quantity?: number | null;
  }>,
  txClient?: Prisma.TransactionClient
): Promise<IRequiredIngredient[]> => {
  const client = txClient || prisma;
  const ingredientMap: Map<string, { name: string; quantity: number; unit: string }> = new Map();

  for (const item of orderItems) {
    if (!item.productId || !item.quantity || item.quantity <= 0) continue;

    const recipes = await client.productRecipe.findMany({
      where: { productId: item.productId },
      include: { ingredient: true },
    });

    for (const recipe of recipes) {
      const itemQty = item.quantity;
      const recipeQty = Number(recipe.quantity);
      const totalQty = itemQty * recipeQty;

      const existing = ingredientMap.get(recipe.ingredientId);
      if (existing) {
        existing.quantity += totalQty;
      } else {
        ingredientMap.set(recipe.ingredientId, {
          name: recipe.ingredient.name,
          quantity: totalQty,
          unit: recipe.unit || recipe.ingredient.unit,
        });
      }
    }
  }

  const result: IRequiredIngredient[] = [];
  for (const [ingredientId, val] of ingredientMap.entries()) {
    result.push({
      ingredientId,
      name: val.name,
      quantity: val.quantity,
      unit: val.unit,
    });
  }

  return result;
};

/**
 * Deterministically checks whether all required ingredients are in stock.
 */
const checkStockAvailability = async (
  requiredIngredients: IRequiredIngredient[],
  txClient?: Prisma.TransactionClient
): Promise<IStockAvailabilityResult> => {
  const client = txClient || prisma;
  const missingIngredients: IStockAvailabilityResult["missingIngredients"] = [];

  for (const req of requiredIngredients) {
    const ingredient = await client.ingredient.findUnique({
      where: { id: req.ingredientId },
    });

    if (!ingredient || !ingredient.isAvailable) {
      missingIngredients.push({
        ingredientId: req.ingredientId,
        name: req.name,
        required: req.quantity,
        availableStock: 0,
        unit: req.unit,
      });
      continue;
    }

    const availableStock = Number(ingredient.currentStock) - Number(ingredient.reservedStock);
    if (availableStock < req.quantity) {
      missingIngredients.push({
        ingredientId: req.ingredientId,
        name: ingredient.name,
        required: req.quantity,
        availableStock: Math.max(0, availableStock),
        unit: ingredient.unit,
      });
    }
  }

  return {
    available: missingIngredients.length === 0,
    requiredIngredients,
    missingIngredients,
  };
};

/**
 * Atomically reserves required ingredients for an order.
 * Prevents race conditions with database row locking / transactional updates.
 */
const reserveStock = async (
  orderId: string,
  requiredIngredients: IRequiredIngredient[],
  txClient?: Prisma.TransactionClient
): Promise<{ success: boolean; message?: string }> => {
  const runInTx = async (tx: Prisma.TransactionClient) => {
    // 1. Check if already reserved to maintain idempotency
    const existingReservations = await tx.stockMovement.findMany({
      where: {
        orderId,
        type: "RESERVED",
      },
    });

    if (existingReservations.length > 0) {
      return { success: true, message: "Stock already reserved for this order" };
    }

    // 2. Validate availability inside transaction
    const availability = await checkStockAvailability(requiredIngredients, tx);
    if (!availability.available) {
      const missingDetails = availability.missingIngredients
        .map((m) => `${m.name}: needed ${m.required}${m.unit}, available ${m.availableStock}${m.unit}`)
        .join("; ");
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Insufficient inventory to fulfill order. Issues: ${missingDetails}`
      );
    }

    // 3. Atomically increment reserved stock & log movements
    for (const req of requiredIngredients) {
      await tx.ingredient.update({
        where: { id: req.ingredientId },
        data: {
          reservedStock: {
            increment: req.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          ingredientId: req.ingredientId,
          orderId,
          quantity: req.quantity,
          type: "RESERVED",
          reason: `Reserved for Order #${orderId}`,
        },
      });
    }

    return { success: true };
  };

  if (txClient) {
    return await runInTx(txClient);
  } else {
    return await prisma.$transaction(async (tx) => {
      return await runInTx(tx);
    }, { maxWait: 20000, timeout: 60000 });
  }
};

/**
 * Atomically deducts reserved stock upon order fulfillment/completion.
 */
const deductStock = async (
  orderId: string,
  txClient?: Prisma.TransactionClient
): Promise<{ success: boolean; message?: string }> => {
  const runInTx = async (tx: Prisma.TransactionClient) => {
    // 1. Check if already deducted
    const alreadyDeducted = await tx.stockMovement.findFirst({
      where: { orderId, type: "DEDUCTED" },
    });

    if (alreadyDeducted) {
      return { success: true, message: "Stock already deducted" };
    }

    // 2. Find all reserved movements for this order
    const reservations = await tx.stockMovement.findMany({
      where: { orderId, type: "RESERVED" },
    });

    if (reservations.length === 0) {
      // If no prior reservation, calculate directly from order items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      });

      if (!order) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
      }

      const required = await calculateRequiredIngredients(order.orderItems, tx);
      for (const item of required) {
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: {
            currentStock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            ingredientId: item.ingredientId,
            orderId,
            quantity: item.quantity,
            type: "DEDUCTED",
            reason: `Direct stock deduction for completed order #${orderId}`,
          },
        });
      }

      return { success: true };
    }

    // 3. Deduct both currentStock and reservedStock
    for (const res of reservations) {
      await tx.ingredient.update({
        where: { id: res.ingredientId },
        data: {
          currentStock: {
            decrement: res.quantity,
          },
          reservedStock: {
            decrement: res.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          ingredientId: res.ingredientId,
          orderId,
          quantity: res.quantity,
          type: "DEDUCTED",
          reason: `Stock deducted on order completion #${orderId}`,
        },
      });
    }

    return { success: true };
  };

  if (txClient) {
    return await runInTx(txClient);
  } else {
    return await prisma.$transaction(async (tx) => {
      return await runInTx(tx);
    }, { maxWait: 20000, timeout: 60000 });
  }
};

/**
 * Releases reserved stock if order fails or is cancelled.
 */
const releaseStock = async (
  orderId: string,
  reason: string = "Order cancelled or failed",
  txClient?: Prisma.TransactionClient
): Promise<{ success: boolean }> => {
  const runInTx = async (tx: Prisma.TransactionClient) => {
    const alreadyReleased = await tx.stockMovement.findFirst({
      where: { orderId, type: "RELEASED" },
    });

    if (alreadyReleased) {
      return { success: true };
    }

    const alreadyDeducted = await tx.stockMovement.findFirst({
      where: { orderId, type: "DEDUCTED" },
    });

    if (alreadyDeducted) {
      // Cannot release if already deducted
      return { success: true };
    }

    const reservations = await tx.stockMovement.findMany({
      where: { orderId, type: "RESERVED" },
    });

    for (const res of reservations) {
      await tx.ingredient.update({
        where: { id: res.ingredientId },
        data: {
          reservedStock: {
            decrement: res.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          ingredientId: res.ingredientId,
          orderId,
          quantity: res.quantity,
          type: "RELEASED",
          reason: `${reason} (#${orderId})`,
        },
      });
    }

    return { success: true };
  };

  if (txClient) {
    return await runInTx(txClient);
  } else {
    return await prisma.$transaction(async (tx) => {
      return await runInTx(tx);
    }, { maxWait: 20000, timeout: 60000 });
  }
};

export const InventoryServices = {
  calculateRequiredIngredients,
  checkStockAvailability,
  reserveStock,
  deductStock,
  releaseStock,
};
