import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateTaxPayload, IUpdateTaxPayload } from "./tax.interface.js";

const createTax = async (payload: ICreateTaxPayload) => {
  // If this tax is set to ACTIVE, deactivate other taxes first
  if (payload.status === "ACTIVE") {
    await prisma.tax.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.tax.create({
    data: payload,
  });
  return result;
};

const getAllTaxes = async () => {
  const result = await prisma.tax.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getTaxById = async (id: string) => {
  const result = await prisma.tax.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tax configuration not found");
  }

  return result;
};

const updateTax = async (id: string, payload: IUpdateTaxPayload) => {
  const tax = await prisma.tax.findUnique({
    where: { id },
  });

  if (!tax) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Tax configuration not found");
  }

  // If status is updated to ACTIVE, deactivate other taxes first
  if (payload.status === "ACTIVE") {
    await prisma.tax.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.tax.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const TaxServices = {
  createTax,
  getAllTaxes,
  getTaxById,
  updateTax,
};
