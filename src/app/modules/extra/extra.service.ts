import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateExtraPayload } from "./extra.interface.js";

const createExtra = async (payload: ICreateExtraPayload) => {
  const result = await prisma.extra.create({
    data: payload,
  });
  return result;
};

const getAllExtras = async () => {
  const result = await prisma.extra.findMany({
    orderBy: {
      name: "asc",
    },
  });
  return result;
};

const deleteExtra = async (id: string) => {
  const extra = await prisma.extra.findUnique({
    where: { id },
  });

  if (!extra) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Extra not found");
  }

  await prisma.extra.delete({
    where: { id },
  });

  return { message: "Extra deleted successfully" };
};

export const ExtraServices = {
  createExtra,
  getAllExtras,
  deleteExtra,
};
