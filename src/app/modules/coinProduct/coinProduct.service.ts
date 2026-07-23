import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import { ICreateCoinProductPayload, ICoinProductFilterableFields, IUpdateCoinProductPayload } from "./coinProduct.interface.js";

const createCoinProduct = async (payload: ICreateCoinProductPayload) => {
  const product = await prisma.product.findUnique({
    where: { id: payload.productId },
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Associated product not found");
  }

  const result = await prisma.coinProduct.create({
    data: {
      productId: payload.productId,
      name: product.name,
      needPoint: payload.needPoint,
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });
  return result;
};

const getAllCoinProducts = async (filters: ICoinProductFilterableFields, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm } = filters;

  const andConditions: Prisma.CoinProductWhereInput[] = [{ isDeleted: false }];

  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { product: { name: { contains: searchTerm, mode: "insensitive" } } },
      ],
    });
  }

  const whereConditions: Prisma.CoinProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  let orderConfig: any = {};
  if (sortBy.toLowerCase() === "createdat" || sortBy.toLowerCase() === "created_at") {
    orderConfig = { createdAt: sortOrder };
  } else {
    orderConfig = { [sortBy]: sortOrder };
  }

  const result = await prisma.coinProduct.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderConfig,
    include: {
      product: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });

  const total = await prisma.coinProduct.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getCoinProductById = async (id: string) => {
  const coinProduct = await prisma.coinProduct.findUnique({
    where: { id },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });

  if (!coinProduct || coinProduct.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Coin product not found");
  }

  return coinProduct;
};

const updateCoinProduct = async (id: string, payload: IUpdateCoinProductPayload) => {
  const coinProduct = await prisma.coinProduct.findUnique({
    where: { id },
  });

  if (!coinProduct || coinProduct.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Coin product not found");
  }

  const updateData: any = { ...payload };

  if (payload.productId) {
    const product = await prisma.product.findUnique({
      where: { id: payload.productId },
    });
    if (!product || product.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Associated product not found");
    }
    updateData.name = product.name;
  }

  const result = await prisma.coinProduct.update({
    where: { id },
    data: updateData,
    include: {
      product: {
        include: {
          category: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    },
  });

  return result;
};

const deleteCoinProduct = async (id: string) => {
  const coinProduct = await prisma.coinProduct.findUnique({
    where: { id },
  });

  if (!coinProduct || coinProduct.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Coin product not found");
  }

  // Soft delete
  await prisma.coinProduct.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Coin product deleted successfully" };
};

export const CoinProductServices = {
  createCoinProduct,
  getAllCoinProducts,
  getCoinProductById,
  updateCoinProduct,
  deleteCoinProduct,
};
