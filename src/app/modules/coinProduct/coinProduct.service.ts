import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import { ICreateCoinProductPayload, ICoinProductFilterableFields, IUpdateCoinProductPayload } from "./coinProduct.interface.js";

const createCoinProduct = async (payload: ICreateCoinProductPayload) => {
  const result = await prisma.coinProduct.create({
    data: payload,
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
      name: {
        contains: searchTerm,
        mode: "insensitive",
      },
    });
  }

  const whereConditions: Prisma.CoinProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Custom sort mapper (e.g. created_at -> createdAt)
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

  const result = await prisma.coinProduct.update({
    where: { id },
    data: payload,
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
