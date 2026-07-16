import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateProductMilkPayload, IUpdateProductMilkPayload } from "./productMilk.interface.js";

const createProductMilk = async (payload: ICreateProductMilkPayload) => {
  const result = await prisma.productMilk.create({
    data: payload,
    include: {
      product: true,
      milk: true,
    },
  });
  return result;
};

const getAllProductMilks = async (productId?: string) => {
  const result = await prisma.productMilk.findMany({
    where: productId ? { productId } : {},
    include: {
      product: true,
      milk: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const getProductMilkById = async (id: string) => {
  const result = await prisma.productMilk.findUnique({
    where: { id },
    include: {
      product: true,
      milk: true,
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product milk option not found");
  }

  return result;
};

const updateProductMilk = async (id: string, payload: IUpdateProductMilkPayload) => {
  const productMilk = await prisma.productMilk.findUnique({
    where: { id },
  });

  if (!productMilk) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product milk option not found");
  }

  const result = await prisma.productMilk.update({
    where: { id },
    data: payload,
    include: {
      product: true,
      milk: true,
    },
  });

  return result;
};

const deleteProductMilk = async (id: string) => {
  const productMilk = await prisma.productMilk.findUnique({
    where: { id },
  });

  if (!productMilk) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product milk option not found");
  }

  await prisma.productMilk.delete({
    where: { id },
  });

  return { message: "Product milk deleted successfully" };
};

export const ProductMilkServices = {
  createProductMilk,
  getAllProductMilks,
  getProductMilkById,
  updateProductMilk,
  deleteProductMilk,
};
