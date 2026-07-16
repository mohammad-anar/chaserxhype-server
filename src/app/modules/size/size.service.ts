import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateSizePayload } from "./size.interface.js";

const createSize = async (payload: ICreateSizePayload) => {
  const result = await prisma.size.create({
    data: payload,
  });
  return result;
};

const getAllSizes = async () => {
  const result = await prisma.size.findMany({
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const deleteSize = async (id: string) => {
  const size = await prisma.size.findUnique({
    where: { id },
  });

  if (!size) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Size not found");
  }

  await prisma.size.delete({
    where: { id },
  });

  return { message: "Size deleted successfully" };
};

export const SizeServices = {
  createSize,
  getAllSizes,
  deleteSize,
};
