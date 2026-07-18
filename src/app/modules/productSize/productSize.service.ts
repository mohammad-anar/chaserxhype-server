import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateProductSizePayload, IUpdateProductSizePayload } from "./productSize.interface.js";

const createProductSize = async (payload: ICreateProductSizePayload) => {
  const result = await prisma.productSize.create({
    data: payload,
    include: {
      product: true,
    },
  });
  return result;
};

const getAllProductSizes = async (productId?: string) => {
  const result = await prisma.productSize.findMany({
    where: productId ? { productId } : {},
    include: {
      product: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const getProductSizeById = async (id: string) => {
  const result = await prisma.productSize.findUnique({
    where: { id },
    include: {
      product: true,
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product size option not found");
  }

  return result;
};

const updateProductSize = async (id: string, payload: IUpdateProductSizePayload) => {
  const productSize = await prisma.productSize.findUnique({
    where: { id },
  });

  if (!productSize) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product size option not found");
  }

  const result = await prisma.productSize.update({
    where: { id },
    data: payload,
    include: {
      product: true,
    },
  });

  return result;
};

const deleteProductSize = async (id: string) => {
  const productSize = await prisma.productSize.findUnique({
    where: { id },
  });

  if (!productSize) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product size option not found");
  }

  await prisma.productSize.delete({
    where: { id },
  });

  return { message: "Product size deleted successfully" };
};

export const ProductSizeServices = {
  createProductSize,
  getAllProductSizes,
  getProductSizeById,
  updateProductSize,
  deleteProductSize,
};
