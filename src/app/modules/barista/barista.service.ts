import { prisma } from "../../../helpers/prisma.js";
import { Prisma, UserRole } from "@prisma/client";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import bcrypt from "bcryptjs";
import { IBaristaScoreResult, IUpdateBaristaProfilePayload } from "./barista.interface.js";
import { emitOrderNotification } from "../../../helpers/socketHelper.js";

/**
 * Calculates a deterministic score for a barista candidate.
 * Score factors:
 * - Availability (+20 vs -1000)
 * - Workload: fewer active orders gives higher score
 * - Skill Level: higher skill adds to score
 */
const calculateScore = (barista: {
  id: string;
  name: string;
  isAvailable: boolean;
  activeOrderCount: number;
  skillLevel: number;
}): IBaristaScoreResult => {
  const availabilityBonus = barista.isAvailable ? 20 : -1000;
  const workloadScore = Math.max(0, 10 - barista.activeOrderCount * 2);
  const skillScore = (barista.skillLevel || 5) * 1.5;

  const totalScore = availabilityBonus + workloadScore + skillScore;

  return {
    baristaId: barista.id,
    name: barista.name,
    score: Number(totalScore.toFixed(2)),
    activeOrderCount: barista.activeOrderCount,
    skillLevel: barista.skillLevel,
    isAvailable: barista.isAvailable,
  };
};

/**
 * Finds the best available barista using deterministic scoring.
 * Strictly searches for dedicated BARISTA role users (never ADMIN).
 */
const findBestAvailableBarista = async (
  txClient?: Prisma.TransactionClient
): Promise<IBaristaScoreResult | null> => {
  const client = txClient || prisma;

  // Look strictly for dedicated BARISTA role users
  const baristas = await client.user.findMany({
    where: {
      role: UserRole.BARISTA,
      status: "ACTIVE",
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      isAvailable: true,
      activeOrderCount: true,
      skillLevel: true,
    },
  });

  if (baristas.length === 0) {
    return null;
  }

  // Calculate scores for all candidates
  const scored = baristas.map(calculateScore);

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  return scored[0];
};

/**
 * Assigns, reassigns, or unassigns a barista to an order atomically.
 * Supports manual preferredBaristaId (including switching baristas and unassigning with null/'unassign'),
 * as well as automated deterministic scoring fallback.
 */
const assignBaristaToOrder = async (
  orderId: string,
  preferredBaristaId?: string | null,
  txClient?: Prisma.TransactionClient
) => {
  const isUnassign =
    preferredBaristaId === null ||
    preferredBaristaId === "" ||
    preferredBaristaId === "unassign";

  const runInTx = async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { assignedBarista: true, user: true },
    });

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
    }

    // Case 1: Unassign barista
    if (isUnassign) {
      if (order.assignedBaristaId) {
        // Decrement active order count on the previous barista (safely)
        await tx.user.update({
          where: { id: order.assignedBaristaId },
          data: {
            activeOrderCount: {
              decrement: 1,
            },
          },
        });

        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: {
            assignedBaristaId: null,
            assignedAt: null,
          },
          include: {
            user: true,
            assignedBarista: true,
            orderItems: { include: { product: true } },
          },
        });

        return {
          assigned: false,
          unassigned: true,
          baristaId: null,
          baristaName: null,
          message: "Barista unassigned from order",
          order: updatedOrder,
        };
      }

      return {
        assigned: false,
        unassigned: true,
        baristaId: null,
        baristaName: null,
        message: "Order has no assigned barista",
        order,
      };
    }

    let targetBaristaId = preferredBaristaId;
    let targetBaristaName: string | undefined;

    // Case 2: Manual assignment with a specified preferredBaristaId
    if (targetBaristaId) {
      if (order.assignedBaristaId === targetBaristaId) {
        return {
          assigned: true,
          baristaId: targetBaristaId,
          baristaName: order.assignedBarista?.name,
          alreadyAssigned: true,
          order,
        };
      }

      const barista = await tx.user.findUnique({ where: { id: targetBaristaId } });
      if (!barista) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Selected barista does not exist");
      }
      if (barista.role !== UserRole.BARISTA) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected user does not have the BARISTA role");
      }
      targetBaristaName = barista.name;

      // If switching from a different barista, decrement previous barista's active count
      if (order.assignedBaristaId && order.assignedBaristaId !== targetBaristaId) {
        await tx.user.update({
          where: { id: order.assignedBaristaId },
          data: {
            activeOrderCount: {
              decrement: 1,
            },
          },
        });
      }
    } else {
      // Case 3: Automated assignment
      if (order.assignedBaristaId) {
        return {
          assigned: true,
          baristaId: order.assignedBaristaId,
          baristaName: order.assignedBarista?.name,
          alreadyAssigned: true,
          order,
        };
      }

      const bestCandidate = await findBestAvailableBarista(tx);
      if (bestCandidate) {
        targetBaristaId = bestCandidate.baristaId;
        targetBaristaName = bestCandidate.name;
      }
    }

    if (!targetBaristaId) {
      return {
        assigned: false,
        message: "No barista currently available. Order queued for manual assignment.",
        order,
      };
    }

    // Atomically assign and update workload
    const now = new Date();
    const nextStatus =
      order.status === "PENDING" || order.status === "CONFIRMED"
        ? "PREPARING"
        : order.status;

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        assignedBaristaId: targetBaristaId,
        assignedAt: now,
        status: nextStatus,
      },
      include: {
        user: true,
        assignedBarista: true,
        orderItems: { include: { product: true } },
      },
    });

    await tx.user.update({
      where: { id: targetBaristaId },
      data: {
        activeOrderCount: {
          increment: 1,
        },
      },
    });

    return {
      assigned: true,
      baristaId: targetBaristaId,
      baristaName: targetBaristaName,
      assignedAt: now,
      order: updatedOrder,
    };
  };

  const result = txClient
    ? await runInTx(txClient)
    : await prisma.$transaction(async (tx) => await runInTx(tx), {
        maxWait: 20000,
        timeout: 60000,
      });

  if (!txClient && result.order) {
    try {
      emitOrderNotification({
        type: "ORDER_STATUS_CHANGED",
        order: result.order,
        message: result.assigned
          ? `Order #${result.order.orderNumber} assigned to Barista ${result.baristaName}.`
          : `Order #${result.order.orderNumber} barista unassigned.`,
      });
    } catch (e) {
      console.warn("Socket notification error on barista assignment:", e);
    }
  }

  return result;
};

/**
 * Decrements the active workload count when an order is completed or cancelled.
 */
const releaseBaristaWorkload = async (
  baristaId: string,
  txClient?: Prisma.TransactionClient
) => {
  const client = txClient || prisma;
  const barista = await client.user.findUnique({ where: { id: baristaId } });
  if (!barista) return;

  const currentCount = barista.activeOrderCount || 0;
  const newCount = Math.max(0, currentCount - 1);

  await client.user.update({
    where: { id: baristaId },
    data: { activeOrderCount: newCount },
  });
};

/**
 * Lists all baristas with their current workload and availability.
 * Strictly returns users with UserRole.BARISTA (excludes ADMIN).
 */
const getAllBaristas = async () => {
  const baristas = await prisma.user.findMany({
    where: {
      role: UserRole.BARISTA,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isAvailable: true,
      skillLevel: true,
      activeOrderCount: true,
      station: true,
      _count: {
        select: {
          assignedOrders: true,
        },
      },
    },
    orderBy: {
      activeOrderCount: "asc",
    },
  });

  return baristas.map((b) => ({
    ...b,
    score: calculateScore(b).score,
  }));
};

/**
 * Updates barista status / skill / station settings.
 */
const updateBaristaProfile = async (
  baristaId: string,
  payload: IUpdateBaristaProfilePayload
) => {
  const user = await prisma.user.findUnique({ where: { id: baristaId } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const updated = await prisma.user.update({
    where: { id: baristaId },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isAvailable: true,
      skillLevel: true,
      activeOrderCount: true,
      station: true,
    },
  });

  return updated;
};

/**
 * Gets authenticated barista's profile and live shift metrics.
 */
const getMyBaristaProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      station: true,
      skillLevel: true,
      isAvailable: true,
      activeOrderCount: true,
    },
  });

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Barista not found");
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [activeOrdersCount, completedTodayCount, totalCompletedCount] = await Promise.all([
    prisma.order.count({
      where: {
        assignedBaristaId: userId,
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
      },
    }),
    prisma.order.count({
      where: {
        assignedBaristaId: userId,
        status: "COMPLETED",
        updatedAt: { gte: startOfToday },
      },
    }),
    prisma.order.count({
      where: {
        assignedBaristaId: userId,
        status: "COMPLETED",
      },
    }),
  ]);

  return {
    ...user,
    metrics: {
      activeOrdersCount,
      completedTodayCount,
      totalCompletedCount,
    },
  };
};

/**
 * Updates authenticated barista's self profile and availability.
 */
const updateMyBaristaProfile = async (
  userId: string,
  payload: IUpdateBaristaProfilePayload
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Barista not found");
  }

  const updateData: any = {};
  if (typeof payload.isAvailable === "boolean") updateData.isAvailable = payload.isAvailable;
  if (payload.station !== undefined) updateData.station = payload.station;
  if (payload.name !== undefined) updateData.name = payload.name;
  if (payload.phone !== undefined) updateData.phone = payload.phone;
  if (payload.profileImage !== undefined) updateData.profileImage = payload.profileImage;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImage: true,
      role: true,
      isAvailable: true,
      skillLevel: true,
      activeOrderCount: true,
      station: true,
    },
  });

  return updated;
};

/**
 * Allows a barista to claim an unassigned order or self-assign.
 */
const claimOrder = async (orderId: string, baristaId: string) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { assignedBarista: true },
    });

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
    }

    if (order.assignedBaristaId && order.assignedBaristaId !== baristaId) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        `Order is already assigned to ${order.assignedBarista?.name || "another barista"}`
      );
    }

    const barista = await tx.user.findUnique({ where: { id: baristaId } });
    if (!barista) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Barista not found");
    }

    const now = new Date();
    const isAlreadyAssigned = order.assignedBaristaId === baristaId;

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        assignedBaristaId: baristaId,
        assignedAt: order.assignedAt || now,
        ...(order.status === "CONFIRMED" || order.status === "PENDING"
          ? { status: "PREPARING", preparedAt: now }
          : {}),
      },
      include: {
        orderItems: {
          include: {
            orderItemExtras: {
              include: { productExtra: true },
            },
            product: true,
            coinProduct: true,
          },
        },
        shippingAddress: true,
        assignedBarista: {
          select: {
            id: true,
            name: true,
            email: true,
            station: true,
          },
        },
      },
    });

    if (!isAlreadyAssigned) {
      await tx.user.update({
        where: { id: baristaId },
        data: {
          activeOrderCount: { increment: 1 },
        },
      });
    }

    return updatedOrder;
  });
};

/**
 * Creates a new barista user or promotes an existing user to BARISTA role.
 */
const createBarista = async (payload: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  station?: string;
  skillLevel?: number;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    if (existingUser.role === UserRole.BARISTA) {
      throw new ApiError(StatusCodes.CONFLICT, "A barista with this email already exists");
    }
    const updated = await prisma.user.update({
      where: { email: payload.email },
      data: {
        role: UserRole.BARISTA,
        name: payload.name || existingUser.name,
        phone: payload.phone || existingUser.phone,
        station: payload.station || "Espresso Main",
        skillLevel: payload.skillLevel || 5,
        isAvailable: true,
        isVerified: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        station: true,
        skillLevel: true,
        isAvailable: true,
        activeOrderCount: true,
      },
    });
    return updated;
  }

  const rawPassword = payload.password || "Barista123@";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const newBarista = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      phone: payload.phone,
      role: UserRole.BARISTA,
      station: payload.station || "Espresso Main",
      skillLevel: payload.skillLevel || 5,
      isAvailable: true,
      isVerified: true,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      station: true,
      skillLevel: true,
      isAvailable: true,
      activeOrderCount: true,
    },
  });

  return newBarista;
};

export const BaristaServices = {
  calculateScore,
  findBestAvailableBarista,
  assignBaristaToOrder,
  releaseBaristaWorkload,
  getAllBaristas,
  updateBaristaProfile,
  getMyBaristaProfile,
  updateMyBaristaProfile,
  claimOrder,
  createBarista,
};
