import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma, SupportTicketStatus } from "@prisma/client";
import { ICreateSupportTicketPayload, ISupportTicketFilterableFields } from "./supportTicket.interface.js";

const createSupportTicket = async (userId: string, payload: ICreateSupportTicketPayload) => {
  const result = await prisma.supportTicket.create({
    data: {
      userId,
      ...payload,
    },
  });
  return result;
};

const getAllSupportTickets = async (filters: ISupportTicketFilterableFields, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, status, date, startDate, endDate } = filters;

  const andConditions: Prisma.SupportTicketWhereInput[] = [];

  // Search user name
  if (searchTerm) {
    andConditions.push({
      user: {
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
    });
  }

  // Filter status
  if (status) {
    andConditions.push({
      status: status as SupportTicketStatus,
    });
  }

  // Filter date (exact date)
  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    andConditions.push({
      createdAt: {
        gte: start,
        lte: end,
      },
    });
  }

  // Filter date range (startDate / endDate)
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    andConditions.push({
      createdAt: {
        gte: start,
        lte: end,
      },
    });
  } else if (startDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    andConditions.push({
      createdAt: {
        gte: start,
      },
    });
  } else if (endDate) {
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);
    andConditions.push({
      createdAt: {
        lte: end,
      },
    });
  }

  const whereConditions: Prisma.SupportTicketWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.supportTicket.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const total = await prisma.supportTicket.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const updateSupportTicketStatus = async (id: string, status: SupportTicketStatus) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
  });

  if (!ticket) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Support ticket not found");
  }

  const result = await prisma.supportTicket.update({
    where: { id },
    data: { status },
  });

  return result;
};

export const SupportTicketServices = {
  createSupportTicket,
  getAllSupportTickets,
  updateSupportTicketStatus,
};
