import { Server, Socket } from "socket.io";
import colors from "colors";
import { prisma } from "./prisma.js";

let io: Server | null = null;

// Store socket IDs for users
const socketMap: Map<string, Set<string>> = new Map();

export const initSocket = (server: any) => {
  io = new Server(server, {
    pingTimeout: 60000,
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(colors.green(`⚡ Socket connected: ${socket.id}`));

    // Register user or admin with their ID
    socket.on("register", (userId: string) => {
      if (!userId) return;
      if (!socketMap.has(userId)) socketMap.set(userId, new Set());
      socketMap.get(userId)!.add(socket.id);
      socket.join(userId);
      console.log(colors.blue(`Socket ${socket.id} registered for ID/Room: ${userId}`));
    });

    socket.on("join_room", (roomName: string) => {
      if (roomName) {
        socket.join(roomName);
        console.log(colors.cyan(`Socket ${socket.id} joined room: ${roomName}`));
      }
    });

    socket.on("disconnect", () => {
      console.log(colors.yellow(`Socket disconnected: ${socket.id}`));
      for (const [id, sockets] of socketMap.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) socketMap.delete(id);
        }
      }
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export interface IOrderNotificationPayload {
  type: "ORDER_PLACED" | "ORDER_STATUS_CHANGED";
  order: any;
  message: string;
}

export const emitOrderNotification = async (payload: IOrderNotificationPayload) => {
  const data = {
    ...payload,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Create DB notification for customer
    if (payload.order?.userId) {
      await prisma.notification.create({
        data: {
          userId: payload.order.userId,
          title: payload.type === "ORDER_PLACED" ? "Order Placed Successfully" : `Order Status Updated: ${payload.order?.status || ''}`,
          message: payload.message,
          type: payload.type,
          orderId: payload.order?.id || null,
        },
      });
    }

    // 2. Create DB notification for admin
    if (payload.type === "ORDER_PLACED") {
      await prisma.notification.create({
        data: {
          userId: null,
          title: "New Store Order Received",
          message: payload.message,
          type: payload.type,
          orderId: payload.order?.id || null,
        },
      });
    }
  } catch (error) {
    console.error("Error creating Notification DB record:", error);
  }

  if (!io) return;

  // Broadcast real-time socket events
  io.emit("order_notification", data);
  io.to("ADMIN").emit("order_notification", data);

  if (payload.order?.userId) {
    io.to(payload.order.userId).emit("order_notification", data);
  }
};