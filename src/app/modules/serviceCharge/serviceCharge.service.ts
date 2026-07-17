import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateServiceChargePayload, IUpdateServiceChargePayload } from "./serviceCharge.interface.js";

const createServiceCharge = async (payload: ICreateServiceChargePayload) => {
  // If set to ACTIVE, deactivate other service charges
  if (payload.status === "ACTIVE") {
    await prisma.serviceCharge.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.serviceCharge.create({
    data: payload,
  });
  return result;
};

const getAllServiceCharges = async () => {
  const result = await prisma.serviceCharge.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getServiceChargeById = async (id: string) => {
  const result = await prisma.serviceCharge.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service charge configuration not found");
  }

  return result;
};

const updateServiceCharge = async (id: string, payload: IUpdateServiceChargePayload) => {
  const config = await prisma.serviceCharge.findUnique({
    where: { id },
  });

  if (!config) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Service charge configuration not found");
  }

  // If updating status to ACTIVE, deactivate other configurations
  if (payload.status === "ACTIVE") {
    await prisma.serviceCharge.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.serviceCharge.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const ServiceChargeServices = {
  createServiceCharge,
  getAllServiceCharges,
  getServiceChargeById,
  updateServiceCharge,
};
