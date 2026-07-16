import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import config from "../../../config/index.js";
import { ISaveCardPayload } from "./savedCard.interface.js";
import { SavedCardStatus } from "@prisma/client";

const createSavedCard = async (userId: string, payload: ISaveCardPayload) => {
  const salt = config.bcrypt_salt_round || 10;
  
  // Encrypt card information via bcrypt as requested
  const hashedCardNumber = await bcrypt.hash(payload.cardNumber, salt);
  const hashedCvc = await bcrypt.hash(payload.cvc, salt);
  const hashedExpireDate = await bcrypt.hash(payload.expireDate, salt);

  const result = await prisma.savedCard.create({
    data: {
      userId,
      cardNumber: hashedCardNumber,
      cvc: hashedCvc,
      expireDate: hashedExpireDate,
    },
  });

  return result;
};

const getMyCards = async (userId: string) => {
  const result = await prisma.savedCard.findMany({
    where: { userId },
  });
  return result;
};

const getCardById = async (userId: string, userRole: string, id: string) => {
  const card = await prisma.savedCard.findUnique({
    where: { id },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Saved card not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && card.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to view this card");
  }

  return card;
};

const deleteCard = async (userId: string, userRole: string, id: string) => {
  const card = await prisma.savedCard.findUnique({
    where: { id },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Saved card not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && card.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to delete this card");
  }

  await prisma.savedCard.delete({
    where: { id },
  });

  return { message: "Saved card deleted successfully" };
};

const updateCardStatus = async (userId: string, userRole: string, id: string, status: SavedCardStatus) => {
  const card = await prisma.savedCard.findUnique({
    where: { id },
  });

  if (!card) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Saved card not found");
  }

  // Authorize owner or admin
  if (userRole !== "ADMIN" && card.userId !== userId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You do not have permission to update this card status");
  }

  const result = await prisma.savedCard.update({
    where: { id },
    data: { status },
  });

  return result;
};

export const SavedCardServices = {
  createSavedCard,
  getMyCards,
  getCardById,
  deleteCard,
  updateCardStatus,
};
