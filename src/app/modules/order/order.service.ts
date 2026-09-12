import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { ICheckoutPayload } from "./order.interface.js";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { OrderStatus, Order, PayType } from "@prisma/client";
import Stripe from "stripe";
import config from "../../../config/index.js";
import { emitOrderNotification } from "../../../helpers/socketHelper.js";
import { enqueueOrderAutomation } from "../../../queues/order.queue.js";
import { InventoryServices } from "../inventory/inventory.service.js";
import { BaristaServices } from "../barista/barista.service.js";

const stripe = new Stripe(config.stripe.stripe_secret_key || "");

const checkout = async (userId: string, payload: ICheckoutPayload) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch user cart with items and extras
    const cart = await tx.cart.findFirst({
      where: { userId },
      include: {
        cartItems: {
          include: {
            cartItemExtras: true,
            product: true,
            coinProduct: true,
          },
        },
      },
    });

    if (!cart || cart.cartItems.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Your cart is empty");
    }

    const isCoinProduct = cart.cartItems[0].isCoinProduct;

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let totalEarnedCoin = 0;
    if (!isCoinProduct) {
      for (const item of cart.cartItems) {
        if (item.product) {
          totalEarnedCoin += (item.product.coin || 0) * item.quantity;
        }
      }
    }

    const totalAmount = Number(cart.total || 0);

    // 2. Create the Order record
    // If it's a coin product, the payment is processed immediately inside this transaction.
    // If it's a normal product, the payment starts as PENDING until Stripe checkout completes.
    const initialStatus = (isCoinProduct && totalAmount <= 0) ? "CONFIRMED" : "PENDING";
    const initialPaymentStatus = (isCoinProduct && totalAmount <= 0) ? "PAID" : "PENDING";

    let shippingAddressPayload = payload.shippingAddress;
    if (!shippingAddressPayload) {
      const userSavedAddress = await tx.address.findFirst({ where: { userId } });
      const userRecord = await tx.user.findUnique({ where: { id: userId } });
      if (userSavedAddress) {
        shippingAddressPayload = {
          fullName: userRecord?.name || undefined,
          street1: userSavedAddress.street1,
          state: userSavedAddress.state || undefined,
          city: userSavedAddress.city,
          country: userSavedAddress.country,
          postalCode: undefined,
          phone: userRecord?.phone || undefined,
        };
      } else if (userRecord) {
        shippingAddressPayload = {
          fullName: userRecord.name,
          street1: "123 Coffee Bean St",
          state: "NY",
          city: "New York",
          country: "United States",
          postalCode: "10001",
          phone: userRecord.phone || undefined,
        };
      }
    }

    let finalNote = payload.note || "";
    if (shippingAddressPayload) {
      const sa = shippingAddressPayload;
      const addrStr = `Shipping: ${sa.street1}, ${sa.city}, ${sa.state ? `${sa.state}, ` : ""}${sa.country}`;
      finalNote = finalNote ? `${finalNote} | ${addrStr}` : addrStr;
    }

    // 2. Deterministically find and assign the best available barista
    const bestBarista = await BaristaServices.findBestAvailableBarista(tx);
    const assignedBaristaId = bestBarista?.baristaId || null;

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        assignedBaristaId,
        assignedAt: assignedBaristaId ? new Date() : null,
        subTotal: isCoinProduct ? 0 : cart.subTotal,
        discount: cart.discount,
        taxAmount: isCoinProduct ? 0 : cart.taxAmount,
        deliveryFee: cart.deliveryFee,
        serviceCharge: cart.serviceCharge,
        paymentMethod: isCoinProduct ? "REWARD_COINS" : "MONEY",
        payType: isCoinProduct ? null : (payload.payType || "CARD"),
        earnedCoin: isCoinProduct ? 0 : totalEarnedCoin,
        usedCoin: isCoinProduct ? cart.totalCoin : 0,
        total: cart.total,
        note: finalNote,
      },
    });

    if (assignedBaristaId) {
      await tx.user.update({
        where: { id: assignedBaristaId },
        data: { activeOrderCount: { increment: 1 } },
      });
    }

    if (shippingAddressPayload) {
      await tx.shippingAddress.create({
        data: {
          orderId: order.id,
          fullName: (shippingAddressPayload as any)?.fullName || null,
          street1: shippingAddressPayload.street1,
          state: shippingAddressPayload.state || null,
          city: shippingAddressPayload.city,
          country: shippingAddressPayload.country,
          postalCode: (shippingAddressPayload as any)?.postalCode || null,
          phone: (shippingAddressPayload as any)?.phone || null,
        },
      });
    }

    // 3. Create OrderItems and OrderItemExtras
    for (const item of cart.cartItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          coinProductId: item.coinProductId,
          isCoinProduct: item.isCoinProduct,
          quantity: item.quantity,
          basePrice: item.basePrice,
          selectedSizeId: item.selectedSizeId,
          selectedMilkId: item.selectedMildId,
          totalPrice: item.totalPrice,
          totalCoin: item.totalCoin ? Number(item.totalCoin) : 0,
        },
      });

      if (item.cartItemExtras.length > 0) {
        await tx.orderItemExtra.createMany({
          data: item.cartItemExtras.map((extra) => ({
            orderItemId: orderItem.id,
            productExtraId: extra.productExtraId,
            price: extra.price,
          })),
        });
      }
    }

    // 4. Process payment and update Wallet balance / Stripe Session
    let paymentUrl = null;

    if (isCoinProduct) {
      // Reward payment flow
      let wallet = await tx.wallet.findFirst({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      const totalCoinCost = Number(cart.totalCoin || 0);
      if (Number(wallet.balance) < totalCoinCost) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Not enough coins. Required: ${totalCoinCost}, Available: ${wallet.balance}`
        );
      }

      // Deduct coins from user's wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: totalCoinCost,
          },
        },
      });

      // Create RewardPayment
      await tx.rewardPayment.create({
        data: {
          orderId: order.id,
          userId,
          transactionId: `TXN-REWARD-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
          status: "PAID",
          coin: totalCoinCost,
          total: totalAmount,
          paidAt: new Date(),
        },
      });

      // Generate transactionId
      const transactionId = `TXN-PENDING-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // If totalAmount > 0, generate Stripe session for delivery fee/service charge
      if (totalAmount > 0) {
        const frontendUrl = config.frontend_url || "http://localhost:3000";
        const feeLineItems = [];

        if (Number(cart.deliveryFee || 0) > 0) {
          feeLineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: "Delivery Fee",
                description: `Delivery fee for Order #${orderNumber}`,
              },
              unit_amount: Math.round(Number(cart.deliveryFee) * 100),
            },
            quantity: 1,
          });
        }

        if (Number(cart.serviceCharge || 0) > 0) {
          feeLineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: "Service Charge",
                description: `Service charge for Order #${orderNumber}`,
              },
              unit_amount: Math.round(Number(cart.serviceCharge) * 100),
            },
            quantity: 1,
          });
        }

        if (Number(cart.taxAmount || 0) > 0) {
          feeLineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: "Tax",
                description: `Tax amount for Order #${orderNumber}`,
              },
              unit_amount: Math.round(Number(cart.taxAmount) * 100),
            },
            quantity: 1,
          });
        }

        if (feeLineItems.length === 0) {
          feeLineItems.push({
            price_data: {
              currency: "usd",
              product_data: {
                name: `Order Fee #${orderNumber}`,
                description: `Payment for Order #${orderNumber} fees`,
              },
              unit_amount: Math.round(totalAmount * 100),
            },
            quantity: 1,
          });
        }

        const session = await stripe.checkout.sessions.create({
          line_items: feeLineItems,
          mode: "payment",
          success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_number=${order.orderNumber}&transaction_id=${transactionId}`,
          cancel_url: `${frontendUrl}/payment/cancel?order_number=${order.orderNumber}&transaction_id=${transactionId}`,
          metadata: {
            orderId: order.id,
            userId: userId,
            totalEarnedCoin: "0",
          },
        });

        paymentUrl = session.url;

        // Create pending Payment record for the monetary fees
        await tx.payment.create({
          data: {
            orderId: order.id,
            userId,
            paymentMethod: payload.payType || "CARD",
            status: "PENDING",
            amount: totalAmount,
            currency: "USD",
            transactionId,
            gatewayPaymentId: session.id,
          },
        });
      }
    } else {
      // Money payment flow using Stripe Checkout Session
      const frontendUrl = config.frontend_url || "http://localhost:3000";
      const transactionId = `TXN-PENDING-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const lineItems = cart.cartItems.map((item) => {
        const itemTotalPrice = Number(item.totalPrice || 0);
        const unitAmount = Math.round((itemTotalPrice / item.quantity) * 100);
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product?.name || "Product",
              description: `Payment for item in Order #${orderNumber}`,
            },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
        };
      });

      if (Number(cart.deliveryFee || 0) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Delivery Fee",
              description: `Delivery fee for Order #${orderNumber}`,
            },
            unit_amount: Math.round(Number(cart.deliveryFee) * 100),
          },
          quantity: 1,
        });
      }

      if (Number(cart.serviceCharge || 0) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Service Charge",
              description: `Service charge for Order #${orderNumber}`,
            },
            unit_amount: Math.round(Number(cart.serviceCharge) * 100),
          },
          quantity: 1,
        });
      }

      if (Number(cart.taxAmount || 0) > 0) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Tax",
              description: `Tax amount for Order #${orderNumber}`,
            },
            unit_amount: Math.round(Number(cart.taxAmount) * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        line_items: lineItems,
        mode: "payment",
        success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&order_number=${order.orderNumber}&transaction_id=${transactionId}`,
        cancel_url: `${frontendUrl}/payment/cancel?order_number=${order.orderNumber}&transaction_id=${transactionId}`,
        metadata: {
          orderId: order.id,
          userId: userId,
          totalEarnedCoin: String(totalEarnedCoin),
        },
      });

      paymentUrl = session.url;

      // Create pending Payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          paymentMethod: payload.payType || "CARD",
          status: "PENDING",
          amount: totalAmount,
          currency: "USD",
          transactionId,
          gatewayPaymentId: session.id,
        },
      });
    }

    // 5. Clear user cart items
    const itemIds = cart.cartItems.map((item) => item.id);
    await tx.cartItemExtra.deleteMany({
      where: { cartItemId: { in: itemIds } },
    });
    await tx.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        subTotal: 0,
        discount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        serviceCharge: 0,
        total: 0,
        totalCoin: 0,
      },
    });

    // Return the created order with payment links and detail representation
    const resultOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            orderItemExtras: {
              include: {
                productExtra: true,
              },
            },
            product: true,
            coinProduct: true,
          },
        },
        payments: true,
        rewardPayments: true,
        shippingAddress: true,
        assignedBarista: {
          select: {
            id: true,
            name: true,
            email: true,
            station: true,
            skillLevel: true,
          },
        },
      },
    });

    try {
      emitOrderNotification({
        type: "ORDER_PLACED",
        order: resultOrder,
        message: `New Order #${resultOrder?.orderNumber || ''} placed!`,
      });
    } catch (e) {
      console.error("Socket notification error on checkout:", e);
    }

    // Trigger order automation immediately (creates invoice, reserves inventory, assigns barista, sends email)
    if (resultOrder && resultOrder.id) {
      enqueueOrderAutomation(resultOrder.id).catch((err) => {
        console.error("Failed to enqueue order automation on checkout:", err);
      });
    }

    return {
      order: resultOrder,
      paymentUrl,
    };
  });
};

const getMyOrders = async (userId: string, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const result = await prisma.order.findMany({
    where: { userId },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      orderItems: {
        include: {
          orderItemExtras: {
            include: {
              productExtra: true,
            },
          },
          product: true,
          coinProduct: true,
        },
      },
      payments: true,
      rewardPayments: true,
      shippingAddress: true,
    },
  });

  const total = await prisma.order.count({ where: { userId } });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getOrderById = async (userId: string, role: string, orderId: string) => {
  const isId = !orderId.startsWith("ORD-");
  const whereClause: any = isId ? { id: orderId } : { orderNumber: orderId };
  if (role !== "ADMIN" && role !== "BARISTA") {
    whereClause.userId = userId;
  }

  const result = await prisma.order.findFirst({
    where: whereClause,
    include: {
      orderItems: {
        include: {
          orderItemExtras: {
            include: {
              productExtra: true,
            },
          },
          product: true,
          coinProduct: true,
        },
      },
      payments: true,
      rewardPayments: true,
      shippingAddress: true,
      assignedBarista: {
        select: {
          id: true,
          name: true,
          email: true,
          station: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImage: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
  }

  return result;
};

const getBaristaOrders = async (
  baristaId: string,
  options: {
    status?: string;
    view?: string;
    searchTerm?: string;
  }
) => {
  const { status, view = "all", searchTerm } = options;

  const andConditions: any[] = [];

  if (view === "assigned") {
    andConditions.push({ assignedBaristaId: baristaId });
    if (!status) {
      andConditions.push({ status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] } });
    }
  } else if (view === "unassigned") {
    andConditions.push({ assignedBaristaId: null });
    andConditions.push({ status: { in: ["PENDING", "CONFIRMED"] } });
  } else if (view === "completed") {
    andConditions.push({ assignedBaristaId: baristaId });
    andConditions.push({ status: "COMPLETED" });
  } else {
    andConditions.push({
      OR: [
        { assignedBaristaId: baristaId },
        {
          assignedBaristaId: null,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
      ],
    });
  }

  if (status && String(status).toUpperCase() !== "ALL") {
    let targetStatus = String(status).toUpperCase();
    if (targetStatus === "CANCELLED") targetStatus = "CANCELED";
    andConditions.push({ status: targetStatus as OrderStatus });
  }

  if (searchTerm && String(searchTerm).trim() !== "") {
    const term = String(searchTerm).trim();
    andConditions.push({
      OR: [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        { shippingAddress: { fullName: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

  const orders = await prisma.order.findMany({
    where: whereConditions,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      orderItems: {
        include: {
          orderItemExtras: {
            include: {
              productExtra: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              image: true,
              temperatureType: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          coinProduct: {
            select: {
              id: true,
              name: true,
              needPoint: true,
              product: {
                select: {
                  image: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImage: true,
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
      payments: true,
    },
  });

  const unassignedCount = await prisma.order.count({
    where: {
      assignedBaristaId: null,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });

  const myAssignedCount = await prisma.order.count({
    where: {
      assignedBaristaId: baristaId,
      status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
    },
  });

  const myPreparingCount = await prisma.order.count({
    where: {
      assignedBaristaId: baristaId,
      status: "PREPARING",
    },
  });

  const myReadyCount = await prisma.order.count({
    where: {
      assignedBaristaId: baristaId,
      status: "READY",
    },
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const myCompletedTodayCount = await prisma.order.count({
    where: {
      assignedBaristaId: baristaId,
      status: "COMPLETED",
      updatedAt: { gte: startOfToday },
    },
  });

  return {
    meta: {
      unassignedCount,
      myAssignedCount,
      myPreparingCount,
      myReadyCount,
      myCompletedTodayCount,
      totalReturned: orders.length,
    },
    data: orders,
  };
};

const getAllOrders = async (options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { status, searchTerm } = options;

  const andConditions: any[] = [];

  if (status && String(status).toUpperCase() !== "ALL") {
    let targetStatus = String(status).toUpperCase();
    if (targetStatus === "CANCELLED") targetStatus = "CANCELED";
    andConditions.push({ status: targetStatus as OrderStatus });
  }

  if (searchTerm && String(searchTerm).trim() !== "") {
    const term = String(searchTerm).trim();
    andConditions.push({
      OR: [
        { orderNumber: { contains: term, mode: "insensitive" } },
        { user: { name: { contains: term, mode: "insensitive" } } },
        { user: { email: { contains: term, mode: "insensitive" } } },
        { shippingAddress: { fullName: { contains: term, mode: "insensitive" } } },
        { shippingAddress: { phone: { contains: term, mode: "insensitive" } } },
      ],
    });
  }

  const whereConditions = andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.order.findMany({
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
        },
      },
      shippingAddress: true,
      assignedBarista: {
        select: {
          id: true,
          name: true,
          email: true,
          station: true,
          isAvailable: true,
        },
      },
      orderItems: {
        include: {
          orderItemExtras: {
            include: {
              productExtra: true,
            },
          },
          product: true,
          coinProduct: true,
        },
      },
      payments: true,
      rewardPayments: true,
    },
  });

  const total = await prisma.order.count({ where: whereConditions });

  const statusCountsGroupBy = await prisma.order.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });

  const statusCounts: Record<string, number> = {
    PREPARING: 0,
    COMPLETED: 0,
    CANCELED: 0,
    PENDING: 0,
    CONFIRMED: 0,
    READY: 0,
    OUT_FOR_DELIVERY: 0,
    REFUNDED: 0,
    FAILED: 0,
    TOTAL: 0,
  };

  statusCountsGroupBy.forEach((item) => {
    statusCounts[item.status] = item._count.id;
    statusCounts.TOTAL += item._count.id;
  });

  const totalPage = Math.ceil(total / limit) || 1;

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
      statusCounts,
    },
    data: result,
  };
};

const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
  const orderExists = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!orderExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === "PREPARING" && !orderExists.preparedAt ? { preparedAt: new Date() } : {}),
      },
      include: {
        orderItems: {
          include: {
            orderItemExtras: {
              include: {
                productExtra: true,
              },
            },
            product: true,
            coinProduct: true,
          },
        },
        payments: true,
        rewardPayments: true,
        assignedBarista: true,
      },
    });

    // If order transitioned to COMPLETED -> Deduct stock and release barista workload
    if (status === "COMPLETED") {
      await InventoryServices.deductStock(orderId, tx);
      if (orderExists.assignedBaristaId) {
        await BaristaServices.releaseBaristaWorkload(orderExists.assignedBaristaId, tx);
      }
    }

    // If order transitioned to CANCELED or FAILED -> Release stock and release barista workload
    if (status === "CANCELED" || status === "FAILED") {
      await InventoryServices.releaseStock(orderId, `Order status set to ${status}`, tx);
      if (orderExists.assignedBaristaId) {
        await BaristaServices.releaseBaristaWorkload(orderExists.assignedBaristaId, tx);
      }
    }

    return updated;
  });

  try {
    emitOrderNotification({
      type: "ORDER_STATUS_CHANGED",
      order: result,
      message: `Order #${result.orderNumber} status changed to ${status}!`,
    });
  } catch (e) {
    console.error("Socket notification error on status update:", e);
  }

  return result;
};

const refundOrder = async (orderId: string) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch order with payments and reward payments
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: true,
        rewardPayments: true,
      },
    });

    if (!order) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
    }

    if (order.paymentStatus !== "PAID") {
      throw new ApiError(StatusCodes.BAD_REQUEST, `Cannot refund order with payment status: ${order.paymentStatus}`);
    }

    // 2. Perform Stripe Refunds for any paid standard Payment records
    for (const payment of order.payments) {
      if (payment.status === "PAID" && payment.transactionId) {
        if (payment.transactionId.startsWith("pi_")) {
          try {
            await stripe.refunds.create({
              payment_intent: payment.transactionId,
            });
          } catch (err: any) {
            console.error(`Stripe refund failed for transaction ${payment.transactionId}:`, err.message);
          }
        }

        // Update payment status in db
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: "REFUNDED" },
        });
      }
    }

    // 3. Handle Reward Coins refund and deduction
    let wallet = await tx.wallet.findFirst({ where: { userId: order.userId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: { userId: order.userId, balance: 0 },
      });
    }

    if (order.paymentMethod === "REWARD_COINS") {
      // If paid with coins, refund the coins back to the user
      const refundCoins = Number(order.usedCoin || 0);
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: refundCoins,
          },
        },
      });

      // Update RewardPayment statuses to REFUNDED
      await tx.rewardPayment.updateMany({
        where: { orderId: order.id, status: "PAID" },
        data: { status: "REFUNDED" },
      });
    } else {
      // If paid with Money, deduct the earned coins to prevent abuse
      const earnedCoins = Number(order.earnedCoin || 0);
      if (earnedCoins > 0) {
        const newBalance = Math.max(0, Number(wallet.balance) - earnedCoins);
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });
      }
    }

    // 4. Update Order statuses to REFUNDED
    const result = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "REFUNDED",
        paymentStatus: "REFUNDED",
      },
      include: {
        orderItems: {
          include: {
            orderItemExtras: {
              include: {
                productExtra: true,
              },
            },
            product: true,
            coinProduct: true,
          },
        },
        payments: true,
        rewardPayments: true,
      },
    });

    // 5. Release any reserved stock and barista workload
    await InventoryServices.releaseStock(order.id, "Order refunded", tx);
    if (order.assignedBaristaId) {
      await BaristaServices.releaseBaristaWorkload(order.assignedBaristaId, tx);
    }

    return result;
  });
};

const addTipToOrder = async (
  userId: string,
  orderId: string,
  payload: {
    amount: number;
    message?: string;
    payType?: string;
  }
) => {
  const isId = !orderId.startsWith("ORD-");
  const order = await prisma.order.findFirst({
    where: isId ? { id: orderId } : { orderNumber: orderId },
    include: {
      assignedBarista: {
        select: {
          id: true,
          name: true,
          email: true,
          station: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      tip: true,
    },
  });

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
  }

  const tipAmountNum = Number(payload.amount);
  if (isNaN(tipAmountNum) || tipAmountNum <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Valid positive tip amount is required");
  }

  const result = await prisma.$transaction(async (tx) => {
    let createdTip;
    if (order.tip) {
      createdTip = await tx.tip.update({
        where: { id: order.tip.id },
        data: {
          amount: { increment: tipAmountNum },
          message: payload.message || order.tip.message,
          payType: (payload.payType as any) || order.tip.payType,
        },
        include: {
          barista: {
            select: { id: true, name: true, station: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } else {
      createdTip = await tx.tip.create({
        data: {
          orderId: order.id,
          userId: userId,
          baristaId: order.assignedBaristaId || null,
          amount: tipAmountNum,
          message: payload.message || null,
          payType: (payload.payType as any) || "CARD",
        },
        include: {
          barista: {
            select: { id: true, name: true, station: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        tipAmount: { increment: tipAmountNum },
      },
    });

    return createdTip;
  });

  try {
    emitOrderNotification({
      type: "TIP_RECEIVED",
      order: {
        ...order,
        tipAmount: Number(order.tipAmount || 0) + tipAmountNum,
      },
      message: `Received a $${tipAmountNum.toFixed(2)} tip for Order #${order.orderNumber}!`,
    });
  } catch (e) {
    console.error("Socket error on tip:", e);
  }

  return result;
};

const getDailyTipsSummary = async (options?: { startDate?: string; endDate?: string }) => {
  const andConditions: any[] = [];
  if (options?.startDate) {
    andConditions.push({ createdAt: { gte: new Date(options.startDate) } });
  }
  if (options?.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    andConditions.push({ createdAt: { lte: end } });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const allTips = await prisma.tip.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          total: true,
          createdAt: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
        },
      },
      barista: {
        select: {
          id: true,
          name: true,
          station: true,
          skillLevel: true,
          profileImage: true,
        },
      },
    },
  });

  const totalTips = allTips.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayTips = allTips
    .filter((t) => new Date(t.createdAt) >= startOfToday)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalTippedOrders = allTips.length;
  const avgTip = totalTippedOrders > 0 ? Number((totalTips / totalTippedOrders).toFixed(2)) : 0;

  const dailyMap = new Map<string, { date: string; totalAmount: number; count: number }>();
  allTips.forEach((tip) => {
    const d = new Date(tip.createdAt).toISOString().split("T")[0];
    const existing = dailyMap.get(d) || { date: d, totalAmount: 0, count: 0 };
    existing.totalAmount += Number(tip.amount || 0);
    existing.count += 1;
    dailyMap.set(d, existing);
  });

  const dailyBreakdown = Array.from(dailyMap.values()).map((d) => ({
    date: d.date,
    totalAmount: Number(d.totalAmount.toFixed(2)),
    count: d.count,
    avgTip: Number((d.totalAmount / d.count).toFixed(2)),
  }));
  dailyBreakdown.sort((a, b) => b.date.localeCompare(a.date));

  const baristaMap = new Map<
    string,
    {
      baristaId: string;
      name: string;
      station: string;
      totalTips: number;
      count: number;
    }
  >();

  allTips.forEach((tip) => {
    const bId = tip.baristaId || "unassigned";
    const bName = tip.barista?.name || "Unassigned / General Pool";
    const bStation = tip.barista?.station || "Main Kitchen";
    const existing = baristaMap.get(bId) || {
      baristaId: bId,
      name: bName,
      station: bStation,
      totalTips: 0,
      count: 0,
    };
    existing.totalTips += Number(tip.amount || 0);
    existing.count += 1;
    baristaMap.set(bId, existing);
  });

  const baristaLeaderboard = Array.from(baristaMap.values()).map((b) => ({
    baristaId: b.baristaId,
    name: b.name,
    station: b.station,
    totalTips: Number(b.totalTips.toFixed(2)),
    count: b.count,
    avgTip: Number((b.totalTips / b.count).toFixed(2)),
  }));
  baristaLeaderboard.sort((a, b) => b.totalTips - a.totalTips);

  return {
    kpis: {
      totalTips: Number(totalTips.toFixed(2)),
      todayTips: Number(todayTips.toFixed(2)),
      totalTippedOrders,
      avgTip,
    },
    dailyBreakdown,
    baristaLeaderboard,
    recentTips: allTips.slice(0, 30),
  };
};

export const OrderServices = {
  checkout,
  getMyOrders,
  getOrderById,
  getAllOrders,
  getBaristaOrders,
  updateOrderStatus,
  refundOrder,
  addTipToOrder,
  getDailyTipsSummary,
};
