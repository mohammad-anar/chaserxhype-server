import { prisma } from "../../../helpers/prisma.js";

const getMyNotifications = async (user: any) => {
  const isSuperAdminOrAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const notifications = await prisma.notification.findMany({
    where: isSuperAdminOrAdmin
      ? {
          OR: [{ userId: null }, { userId: user.id }],
        }
      : {
          userId: user.id,
        },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: isSuperAdminOrAdmin
      ? {
          OR: [{ userId: null }, { userId: user.id }],
          isRead: false,
        }
      : {
          userId: user.id,
          isRead: false,
        },
  });

  return {
    notifications,
    unreadCount,
  };
};

const markAsRead = async (id: string, user: any) => {
  const result = await prisma.notification.updateMany({
    where: {
      id,
    },
    data: {
      isRead: true,
    },
  });

  return result;
};

const markAllAsRead = async (user: any) => {
  const isSuperAdminOrAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const result = await prisma.notification.updateMany({
    where: isSuperAdminOrAdmin
      ? {
          OR: [{ userId: null }, { userId: user.id }],
          isRead: false,
        }
      : {
          userId: user.id,
          isRead: false,
        },
    data: {
      isRead: true,
    },
  });

  return result;
};

export const NotificationService = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
