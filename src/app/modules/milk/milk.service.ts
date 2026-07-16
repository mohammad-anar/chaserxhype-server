import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateMilkPayload } from "./milk.interface.js";

const createMilk = async (payload: ICreateMilkPayload) => {
  const result = await prisma.milk.create({
    data: payload,
  });
  return result;
};

const getAllMilks = async () => {
  const result = await prisma.milk.findMany({
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const deleteMilk = async (id: string) => {
  const milk = await prisma.milk.findUnique({
    where: { id },
  });

  if (!milk) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Milk not found");
  }

  await prisma.milk.delete({
    where: { id },
  });

  return { message: "Milk deleted successfully" };
};

export const MilkServices = {
  createMilk,
  getAllMilks,
  deleteMilk,
};
