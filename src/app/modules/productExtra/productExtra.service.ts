import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateProductExtraPayload, IUpdateProductExtraPayload } from "./productExtra.interface.js";

const createProductExtra = async (payload: ICreateProductExtraPayload) => {
  const result = await prisma.productExtra.create({
    data: payload,
    include: {
      product: true,
      extra: true,
    },
  });
  return result;
};

const getAllProductExtras = async (productId?: string) => {
  const result = await prisma.productExtra.findMany({
    where: productId ? { productId } : {},
    include: {
      product: true,
      extra: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const getProductExtraById = async (id: string) => {
  const result = await prisma.productExtra.findUnique({
    where: { id },
    include: {
      product: true,
      extra: true,
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product extra option not found");
  }

  return result;
};

const updateProductExtra = async (id: string, payload: IUpdateProductExtraPayload) => {
  const productExtra = await prisma.productExtra.findUnique({
    where: { id },
  });

  if (!productExtra) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product extra option not found");
  }

  const result = await prisma.productExtra.update({
    where: { id },
    data: payload,
    include: {
      product: true,
      extra: true,
    },
  });

  return result;
};

const deleteProductExtra = async (id: string) => {
  const productExtra = await prisma.productExtra.findUnique({
    where: { id },
  });

  if (!productExtra) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product extra option not found");
  }

  await prisma.productExtra.delete({
    where: { id },
  });

  return { message: "Product extra deleted successfully" };
};

export const ProductExtraServices = {
  createProductExtra,
  getAllProductExtras,
  getProductExtraById,
  updateProductExtra,
  deleteProductExtra,
};
