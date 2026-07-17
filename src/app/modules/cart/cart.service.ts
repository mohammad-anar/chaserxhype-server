import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import { IAddCartItemPayload, IUpdateCartItemPayload } from "./cart.interface.js";

// Helper to compute user's current coin balance
const getUserCoins = async (userId: string): Promise<number> => {
  // Earned from reward payments (completed/paid)
  const rewardEarned = await prisma.rewardPayment.aggregate({
    where: {
      userId,
      status: "PAID",
    },
    _sum: {
      coin: true,
    },
  });

  // Earned from orders
  const orderEarned = await prisma.order.aggregate({
    where: {
      userId,
      paymentStatus: "PAID",
    },
    _sum: {
      earnedCoin: true,
    },
  });

  // Used in orders
  const orderUsed = await prisma.order.aggregate({
    where: {
      userId,
      paymentStatus: "PAID",
    },
    _sum: {
      usedCoin: true,
    },
  });

  const totalEarned = (rewardEarned._sum.coin || 0) + (orderEarned._sum.earnedCoin || 0);
  const totalUsed = orderUsed._sum.usedCoin || 0;

  return totalEarned - totalUsed;
};

// Recalculates all cart totals and updates the Cart record
const recalculateCart = async (cartId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      cartItems: {
        include: {
          product: true,
          coinProduct: {
            include: {
              product: true,
            },
          },
          selectedSize: true,
          selectedMild: true, // ProductMilk
          cartItemExtras: {
            include: {
              productExtra: true,
            },
          },
        },
      },
    },
  });

  if (!cart) return null;

  if (cart.cartItems.length === 0) {
    return await prisma.cart.update({
      where: { id: cartId },
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
  }

  // Determine if it is a coin product cart based on the first item
  const isCoinProductCart = cart.cartItems[0].isCoinProduct;

  // Fetch active configurations
  const activeTax = await prisma.tax.findFirst({ where: { status: "ACTIVE" } });
  const activeDelivery = await prisma.deliveryFee.findFirst({ where: { status: "ACTIVE" } });
  const activeService = await prisma.serviceCharge.findFirst({ where: { status: "ACTIVE" } });

  let subTotal = 0;
  let totalCoin = 0;
  let deliveryFee = activeDelivery ? Number(activeDelivery.amount) : 0;
  let serviceCharge = activeService ? Number(activeService.amount) : 0;

  for (const item of cart.cartItems) {
    if (item.isCoinProduct) {
      const coinCost = item.coinProduct ? item.coinProduct.needPoint * item.quantity : 0;
      totalCoin += coinCost;

      // Update item totalPrice = 0, totalCoin = coinCost
      await prisma.cartItem.update({
        where: { id: item.id },
        data: {
          totalPrice: 0,
          totalCoin: coinCost,
        },
      });
    } else {
      // Calculate item price with variants
      const baseProductPrice = item.product ? Number(item.product.basePrice) : 0;
      
      let sizeAdjust = 0;
      if (item.selectedSize) {
        const adj = Number(item.selectedSize.priceAdjustment);
        sizeAdjust = item.selectedSize.adjustmentType === "ADD" ? adj : -adj;
      }

      let milkAdjust = 0;
      if (item.selectedMild) {
        const adj = Number(item.selectedMild.priceAdjustment);
        milkAdjust = item.selectedMild.adjustmentType === "ADD" ? adj : -adj;
      }

      let extrasPrice = 0;
      for (const extra of item.cartItemExtras) {
        extrasPrice += Number(extra.price);
      }

      const unitPrice = baseProductPrice + sizeAdjust + milkAdjust + extrasPrice;
      const itemTotalPrice = unitPrice * item.quantity;

      subTotal += itemTotalPrice;

      await prisma.cartItem.update({
        where: { id: item.id },
        data: {
          basePrice: unitPrice,
          totalPrice: itemTotalPrice,
          totalCoin: 0,
        },
      });
    }
  }

  let taxAmount = 0;
  let total = 0;

  if (isCoinProductCart) {
    // For coin products, no tax is applied. Only delivery fee and service charge are applied financially.
    taxAmount = 0;
    subTotal = 0;
    total = deliveryFee + serviceCharge;
  } else {
    // For normal products, apply tax, delivery, and service charges
    if (activeTax) {
      if (activeTax.type === "PERCENTAGE") {
        taxAmount = subTotal * (Number(activeTax.amount) / 100);
      } else {
        taxAmount = Number(activeTax.amount);
      }
    }
    total = subTotal + taxAmount + deliveryFee + serviceCharge;
  }

  const updatedCart = await prisma.cart.update({
    where: { id: cartId },
    data: {
      subTotal,
      discount: 0,
      taxAmount,
      deliveryFee,
      serviceCharge,
      total,
      totalCoin,
    },
    include: {
      cartItems: {
        include: {
          product: true,
          coinProduct: {
            include: {
              product: true,
            },
          },
          selectedSize: true,
          selectedMild: true,
          cartItemExtras: {
            include: {
              productExtra: true,
            },
          },
        },
      },
    },
  });

  return updatedCart;
};

const getOrCreateCart = async (userId: string) => {
  let cart = await prisma.cart.findFirst({
    where: { userId },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: {
        userId,
        subTotal: 0,
        discount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        serviceCharge: 0,
        total: 0,
        totalCoin: 0,
      },
    });
  }

  return cart;
};

const addCartItem = async (userId: string, payload: IAddCartItemPayload) => {
  const { isCoinProduct, productId, coinProductId, quantity, selectedSizeId, selectedMildId, extras } = payload;

  const cart = await getOrCreateCart(userId);

  // Fetch existing cart items to enforce no-mixing policy
  const existingItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
  });

  if (existingItems.length > 0) {
    const existingIsCoin = existingItems[0].isCoinProduct;
    if (existingIsCoin !== isCoinProduct) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Cannot add coin products and normal products to the same cart. Please purchase them separately."
      );
    }
  }

  // Coin validation
  if (isCoinProduct) {
    if (!coinProductId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Coin product ID is required");
    }

    const coinProduct = await prisma.coinProduct.findUnique({
      where: { id: coinProductId },
    });

    if (!coinProduct || coinProduct.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Coin product not found");
    }

    // Check user points balance
    const userCoins = await getUserCoins(userId);
    const coinsNeeded = coinProduct.needPoint * quantity;
    const currentCartCoins = Number(cart.totalCoin || 0);

    if (userCoins < currentCartCoins + coinsNeeded) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Not enough coins. You have ${userCoins} coins, but the cart would require ${currentCartCoins + coinsNeeded} coins.`
      );
    }

    // Check if the same coin product is already in the cart
    const sameItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        coinProductId,
      },
    });

    if (sameItem) {
      await prisma.cartItem.update({
        where: { id: sameItem.id },
        data: { quantity: sameItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          coinProductId,
          isCoinProduct: true,
          quantity,
        },
      });
    }
  } else {
    // Normal product flow
    if (!productId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Product ID is required");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
    }

    // Validate size, milk and extra options belong to this product
    if (selectedSizeId) {
      const productSize = await prisma.productSize.findFirst({
        where: { id: selectedSizeId, productId },
      });
      if (!productSize) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected size is invalid for this product");
      }
    }

    if (selectedMildId) {
      const productMilk = await prisma.productMilk.findFirst({
        where: { id: selectedMildId, productId },
      });
      if (!productMilk) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected milk is invalid for this product");
      }
    }

    if (extras && extras.length > 0) {
      const matchedExtrasCount = await prisma.productExtra.count({
        where: { id: { in: extras }, productId },
      });
      if (matchedExtrasCount !== extras.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "One or more selected extra options are invalid for this product");
      }
    }

    // Check if matching cart item already exists (same size, milk, and extras)
    const candidates = await prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId,
        selectedSizeId: selectedSizeId || null,
        selectedMildId: selectedMildId || null,
      },
      include: {
        cartItemExtras: true,
      },
    });

    let matchedItem = null;
    const sortedExtrasPayload = extras ? [...extras].sort() : [];

    for (const cand of candidates) {
      const candExtras = cand.cartItemExtras.map((e) => e.productExtraId).sort();
      if (JSON.stringify(candExtras) === JSON.stringify(sortedExtrasPayload)) {
        matchedItem = cand;
        break;
      }
    }

    if (matchedItem) {
      await prisma.cartItem.update({
        where: { id: matchedItem.id },
        data: { quantity: matchedItem.quantity + quantity },
      });
    } else {
      // Create new cart item
      await prisma.$transaction(async (tx) => {
        const newItem = await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            isCoinProduct: false,
            quantity,
            selectedSizeId: selectedSizeId || null,
            selectedMildId: selectedMildId || null,
          },
        });

        if (extras && extras.length > 0) {
          // Fetch extra prices
          const extrasDetails = await tx.productExtra.findMany({
            where: { id: { in: extras } },
          });

          await tx.cartItemExtra.createMany({
            data: extrasDetails.map((ext) => ({
              cartItemId: newItem.id,
              productExtraId: ext.id,
              price: ext.price,
            })),
          });
        }
      });
    }
  }

  // Recalculate totals
  return await recalculateCart(cart.id);
};

const updateCartItem = async (userId: string, cartItemId: string, payload: IUpdateCartItemPayload) => {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: {
      coinProduct: true,
      cartItemExtras: true,
    },
  });

  if (!cartItem || cartItem.cartId !== cart.id) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Cart item not found");
  }

  const { quantity, selectedSizeId, selectedMildId, extras } = payload;

  if (cartItem.isCoinProduct && quantity !== undefined) {
    const userCoins = await getUserCoins(userId);
    const needPoint = cartItem.coinProduct ? cartItem.coinProduct.needPoint : 0;
    const originalCost = needPoint * cartItem.quantity;
    const newCost = needPoint * quantity;
    const currentCartCoins = Number(cart.totalCoin || 0);

    if (userCoins < currentCartCoins - originalCost + newCost) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Not enough coins. You have ${userCoins} coins, but updating quantity would require ${currentCartCoins - originalCost + newCost} coins.`
      );
    }
  }

  // Validate that selected size, milk, and extras belong to the product
  if (!cartItem.isCoinProduct) {
    const productId = cartItem.productId as string;

    if (selectedSizeId) {
      const productSize = await prisma.productSize.findFirst({
        where: { id: selectedSizeId, productId },
      });
      if (!productSize) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected size is invalid for this product");
      }
    }

    if (selectedMildId) {
      const productMilk = await prisma.productMilk.findFirst({
        where: { id: selectedMildId, productId },
      });
      if (!productMilk) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Selected milk is invalid for this product");
      }
    }

    if (extras && extras.length > 0) {
      const matchedExtrasCount = await prisma.productExtra.count({
        where: { id: { in: extras }, productId },
      });
      if (matchedExtrasCount !== extras.length) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "One or more selected extra options are invalid for this product");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // Update basic fields
    await tx.cartItem.update({
      where: { id: cartItemId },
      data: {
        ...(quantity !== undefined && { quantity }),
        ...(selectedSizeId !== undefined && { selectedSizeId: selectedSizeId || null }),
        ...(selectedMildId !== undefined && { selectedMildId: selectedMildId || null }),
      },
    });

    // Update extras if provided
    if (extras !== undefined) {
      await tx.cartItemExtra.deleteMany({ where: { cartItemId } });
      if (extras.length > 0) {
        const extrasDetails = await tx.productExtra.findMany({
          where: { id: { in: extras } },
        });

        await tx.cartItemExtra.createMany({
          data: extrasDetails.map((ext) => ({
            cartItemId,
            productExtraId: ext.id,
            price: ext.price,
          })),
        });
      }
    }
  });

  return await recalculateCart(cart.id);
};

const removeCartItem = async (userId: string, cartItemId: string) => {
  const cart = await getOrCreateCart(userId);

  const cartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!cartItem || cartItem.cartId !== cart.id) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Cart item not found");
  }

  // Delete child records first
  await prisma.cartItemExtra.deleteMany({ where: { cartItemId } });

  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });

  return await recalculateCart(cart.id);
};

const getCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);
  return await recalculateCart(cart.id);
};

const clearCart = async (userId: string) => {
  const cart = await getOrCreateCart(userId);

  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
  });

  const itemIds = items.map((i) => i.id);

  await prisma.cartItemExtra.deleteMany({
    where: { cartItemId: { in: itemIds } },
  });

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return await recalculateCart(cart.id);
};

export const CartServices = {
  addCartItem,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
  getUserCoins,
};
