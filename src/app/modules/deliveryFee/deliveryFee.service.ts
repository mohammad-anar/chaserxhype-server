import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateDeliveryFeePayload, IUpdateDeliveryFeePayload } from "./deliveryFee.interface.js";

const createDeliveryFee = async (payload: ICreateDeliveryFeePayload) => {
  // If set to ACTIVE, deactivate other delivery fees
  if (payload.status === "ACTIVE") {
    await prisma.deliveryFee.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.deliveryFee.create({
    data: payload,
  });
  return result;
};

const getAllDeliveryFees = async () => {
  const result = await prisma.deliveryFee.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
  return result;
};

const getDeliveryFeeById = async (id: string) => {
  const result = await prisma.deliveryFee.findUnique({
    where: { id },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery fee configuration not found");
  }

  return result;
};

const updateDeliveryFee = async (id: string, payload: IUpdateDeliveryFeePayload) => {
  const config = await prisma.deliveryFee.findUnique({
    where: { id },
  });

  if (!config) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Delivery fee configuration not found");
  }

  // If updating status to ACTIVE, deactivate other configurations
  if (payload.status === "ACTIVE") {
    await prisma.deliveryFee.updateMany({
      where: { status: "ACTIVE" },
      data: { status: "INACTIVE" },
    });
  }

  const result = await prisma.deliveryFee.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const DeliveryFeeServices = {
  createDeliveryFee,
  getAllDeliveryFees,
  getDeliveryFeeById,
  updateDeliveryFee,
};
