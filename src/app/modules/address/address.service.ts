import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICreateAddressPayload, IUpdateAddressPayload } from "./address.interface.js";

const createAddress = async (userId: string, payload: ICreateAddressPayload) => {
  const result = await prisma.address.create({
    data: {
      userId,
      ...payload,
    },
  });
  return result;
};

const getMyAddresses = async (userId: string) => {
  const result = await prisma.address.findMany({
    where: { userId },
  });
  return result;
};

const getAddressById = async (userId: string, userRole: string, id: string) => {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Address not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to view this address");
  }

  return address;
};

const updateAddress = async (userId: string, userRole: string, id: string, payload: IUpdateAddressPayload) => {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Address not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to update this address");
  }

  const result = await prisma.address.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteAddress = async (userId: string, userRole: string, id: string) => {
  const address = await prisma.address.findUnique({
    where: { id },
  });

  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Address not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && address.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to delete this address");
  }

  await prisma.address.delete({
    where: { id },
  });

  return { message: "Address deleted successfully" };
};

export const AddressServices = {
  createAddress,
  getMyAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
};
