import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateCategoryPayload, IUpdateCategoryPayload } from "./category.interface.js";

const createCategory = async (payload: ICreateCategoryPayload) => {
  const result = await prisma.category.create({
    data: payload,
  });
  return result;
};

const getAllCategories = async () => {
  const result = await prisma.category.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const getAdminCategories = async () => {
  const result = await prisma.category.findMany({
    where: {
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category || category.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  return category;
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category || category.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  const result = await prisma.category.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category || category.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Category not found");
  }

  // Soft delete
  await prisma.category.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Category deleted successfully" };
};

export const CategoryServices = {
  createCategory,
  getAllCategories,
  getAdminCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
