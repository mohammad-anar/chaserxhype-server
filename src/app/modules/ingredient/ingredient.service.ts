import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import {
  ICreateIngredientPayload,
  IIngredientFilterableFields,
  IRestockPayload,
  IUpdateIngredientPayload,
} from "./ingredient.interface.js";

const createIngredient = async (payload: ICreateIngredientPayload) => {
  const isExist = await prisma.ingredient.findUnique({
    where: { name: payload.name },
  });

  if (isExist) {
    throw new ApiError(StatusCodes.CONFLICT, "Ingredient with this name already exists");
  }

  const result = await prisma.$transaction(async (tx) => {
    const ingredient = await tx.ingredient.create({
      data: {
        name: payload.name,
        unit: payload.unit,
        currentStock: payload.currentStock,
        reservedStock: payload.reservedStock ?? 0,
        minStockLevel: payload.minStockLevel ?? 0,
        isAvailable: payload.isAvailable ?? true,
      },
    });

    if (payload.currentStock > 0) {
      await tx.stockMovement.create({
        data: {
          ingredientId: ingredient.id,
          quantity: payload.currentStock,
          type: "IN",
          reason: "Initial Stock Setup",
        },
      });
    }

    return ingredient;
  });

  return result;
};

const getAllIngredients = async (filters: IIngredientFilterableFields, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);
  const { searchTerm, isAvailable, lowStock } = filters;

  const andConditions: Prisma.IngredientWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      name: {
        contains: searchTerm,
        mode: "insensitive",
      },
    });
  }

  if (typeof isAvailable === "boolean") {
    andConditions.push({ isAvailable });
  }

  const whereConditions: Prisma.IngredientWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  let result = await prisma.ingredient.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      _count: {
        select: {
          recipes: true,
          stockMovements: true,
        },
      },
    },
  });

  if (lowStock) {
    result = result.filter(
      (item) => Number(item.currentStock) - Number(item.reservedStock) <= Number(item.minStockLevel)
    );
  }

  const total = await prisma.ingredient.count({ where: whereConditions });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getIngredientById = async (id: string) => {
  const result = await prisma.ingredient.findUnique({
    where: { id },
    include: {
      recipes: {
        include: {
          product: {
            select: { id: true, name: true, slug: true },
          },
        },
      },
      stockMovements: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ingredient not found");
  }

  return result;
};

const updateIngredient = async (id: string, payload: IUpdateIngredientPayload) => {
  const isExist = await prisma.ingredient.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ingredient not found");
  }

  if (payload.name && payload.name !== isExist.name) {
    const duplicate = await prisma.ingredient.findUnique({ where: { name: payload.name } });
    if (duplicate) {
      throw new ApiError(StatusCodes.CONFLICT, "Ingredient with this name already exists");
    }
  }

  const result = await prisma.ingredient.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteIngredient = async (id: string) => {
  const isExist = await prisma.ingredient.findUnique({ where: { id } });
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ingredient not found");
  }

  const result = await prisma.ingredient.delete({
    where: { id },
  });

  return result;
};

const restockIngredient = async (id: string, payload: IRestockPayload) => {
  const ingredient = await prisma.ingredient.findUnique({ where: { id } });
  if (!ingredient) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ingredient not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.ingredient.update({
      where: { id },
      data: {
        currentStock: {
          increment: payload.quantity,
        },
        isAvailable: true,
      },
    });

    await tx.stockMovement.create({
      data: {
        ingredientId: id,
        quantity: payload.quantity,
        type: "IN",
        reason: payload.reason || "Manual Restock",
      },
    });

    return updated;
  });

  return result;
};

const getStockMovements = async (ingredientId?: string, options?: any) => {
  const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options || {});

  const where: Prisma.StockMovementWhereInput = ingredientId ? { ingredientId } : {};

  const result = await prisma.stockMovement.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy || "createdAt"]: sortOrder || "desc",
    },
    include: {
      ingredient: {
        select: { id: true, name: true, unit: true },
      },
      order: {
        select: { id: true, orderNumber: true, status: true },
      },
    },
  });

  const total = await prisma.stockMovement.count({ where });

  return {
    meta: { page, limit, total },
    data: result,
  };
};

export const IngredientServices = {
  createIngredient,
  getAllIngredients,
  getIngredientById,
  updateIngredient,
  deleteIngredient,
  restockIngredient,
  getStockMovements,
};
