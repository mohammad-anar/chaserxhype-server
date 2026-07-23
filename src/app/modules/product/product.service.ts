import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import slugify from "slugify";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import { ICreateProductPayload, IProductFilterableFields, IUpdateProductPayload } from "./product.interface.js";

const productInclude = {
  productSizes: true,
  productMilks: true,
  productExtras: true,
  category: {
    select: {
      id: true,
      name: true,
    },
  },
  _count: {
    select: {
      orderItems: true,
    },
  },
};

const createProduct = async (payload: ICreateProductPayload) => {
  const { productSize, productMilk, productExtra, name, ...productData } = payload;

  const slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();

  const result = await prisma.$transaction(async (tx) => {
    // Create Product
    const product = await tx.product.create({
      data: {
        ...productData,
        name,
        slug,
      },
    });

    // Create ProductSizes
    if (productSize && productSize.length > 0) {
      await tx.productSize.createMany({
        data: productSize.map((item) => ({
          productId: product.id,
          name: item.name,
          oz: item.oz,
          priceAdjustment: item.priceAdjustment,
          adjustmentType: item.adjustmentType,
        })),
      });
    }

    // Create ProductMilks
    if (productMilk && productMilk.length > 0) {
      await tx.productMilk.createMany({
        data: productMilk.map((item) => ({
          productId: product.id,
          name: item.name,
          priceAdjustment: item.priceAdjustment,
          adjustmentType: item.adjustmentType,
        })),
      });
    }

    // Create ProductExtras
    if (productExtra && productExtra.length > 0) {
      await tx.productExtra.createMany({
        data: productExtra.map((item) => ({
          productId: product.id,
          name: item.name,
          price: item.price,
        })),
      });
    }

    return product;
  });

  // Return product with associations
  const finalProduct = await prisma.product.findUnique({
    where: { id: result.id },
    include: productInclude,
  });

  return finalProduct;
};

const getAllProducts = async (filters: IProductFilterableFields, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);

  const { searchTerm, categoryId, minPrice, maxPrice, coin } = filters;

  const andConditions: Prisma.ProductWhereInput[] = [{ isDeleted: false }];

  // Search filter
  if (searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { slug: { contains: searchTerm, mode: "insensitive" } },
        { shortDescription: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  // Category filter
  if (categoryId) {
    andConditions.push({ categoryId });
  }

  // BasePrice filters
  if (minPrice && maxPrice) {
    andConditions.push({
      basePrice: {
        gte: Number(minPrice),
        lte: Number(maxPrice),
      },
    });
  } else if (minPrice) {
    andConditions.push({
      basePrice: {
        gte: Number(minPrice),
      },
    });
  } else if (maxPrice) {
    andConditions.push({
      basePrice: {
        lte: Number(maxPrice),
      },
    });
  }

  // Coin filter
  if (coin) {
    andConditions.push({
      coin: Number(coin),
    });
  }

  const whereConditions: Prisma.ProductWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  // Custom sort mapper
  let orderConfig: any = {};
  if (sortBy === "popular" || sortBy === "orderCount" || sortBy === "ordersCount" || !sortBy) {
    orderConfig = { orderItems: { _count: sortOrder || "desc" } };
  } else if (sortBy.toLowerCase() === "createdat" || sortBy.toLowerCase() === "created_at") {
    orderConfig = { createdAt: sortOrder };
  } else if (sortBy === "price" || sortBy === "basePrice") {
    orderConfig = { basePrice: sortOrder };
  } else {
    orderConfig = { [sortBy]: sortOrder };
  }

  const result = await prisma.product.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy: orderConfig,
    include: productInclude,
  });

  const total = await prisma.product.count({
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

const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  return product;
};

const updateProduct = async (id: string, payload: IUpdateProductPayload) => {
  const { productSize, productMilk, productExtra, name, ...productData } = payload;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  const updatedData: Prisma.ProductUpdateInput = { ...productData };

  if (name) {
    updatedData.name = name;
    updatedData.slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();
  }

  await prisma.$transaction(async (tx) => {
    // Update basic product details
    await tx.product.update({
      where: { id },
      data: updatedData,
    });

    // Update, create or remove product sizes
    if (productSize !== undefined) {
      const existingSizes = await tx.productSize.findMany({
        where: { productId: id },
        select: { id: true },
      });
      const keepIds = productSize.map((s) => s.id).filter((id): id is string => Boolean(id));
      const deletedIds = existingSizes.filter((s) => !keepIds.includes(s.id)).map((s) => s.id);

      if (deletedIds.length > 0) {
        await tx.productSize.deleteMany({
          where: { id: { in: deletedIds } },
        });
      }

      for (const item of productSize) {
        if (item.id) {
          await tx.productSize.update({
            where: { id: item.id },
            data: {
              ...(item.name && { name: item.name }),
              ...(item.oz && { oz: item.oz }),
              ...(item.priceAdjustment !== undefined && { priceAdjustment: item.priceAdjustment }),
              ...(item.adjustmentType && { adjustmentType: item.adjustmentType }),
            },
          });
        } else {
          await tx.productSize.create({
            data: {
              productId: id,
              name: item.name || "Regular",
              oz: item.oz || "12oz",
              priceAdjustment: item.priceAdjustment ?? 0,
              adjustmentType: item.adjustmentType || "ADD",
            },
          });
        }
      }
    }

    // Update, create or remove product milks
    if (productMilk !== undefined) {
      const existingMilks = await tx.productMilk.findMany({
        where: { productId: id },
        select: { id: true },
      });
      const keepIds = productMilk.map((m) => m.id).filter((id): id is string => Boolean(id));
      const deletedIds = existingMilks.filter((m) => !keepIds.includes(m.id)).map((m) => m.id);

      if (deletedIds.length > 0) {
        await tx.productMilk.deleteMany({
          where: { id: { in: deletedIds } },
        });
      }

      for (const item of productMilk) {
        if (item.id) {
          await tx.productMilk.update({
            where: { id: item.id },
            data: {
              ...(item.name && { name: item.name }),
              ...(item.priceAdjustment !== undefined && { priceAdjustment: item.priceAdjustment }),
              ...(item.adjustmentType && { adjustmentType: item.adjustmentType }),
            },
          });
        } else {
          await tx.productMilk.create({
            data: {
              productId: id,
              name: item.name || "Milk",
              priceAdjustment: item.priceAdjustment ?? 0,
              adjustmentType: item.adjustmentType || "ADD",
            },
          });
        }
      }
    }

    // Update, create or remove product extras
    if (productExtra !== undefined) {
      const existingExtras = await tx.productExtra.findMany({
        where: { productId: id },
        select: { id: true },
      });
      const keepIds = productExtra.map((e) => e.id).filter((id): id is string => Boolean(id));
      const deletedIds = existingExtras.filter((e) => !keepIds.includes(e.id)).map((e) => e.id);

      if (deletedIds.length > 0) {
        await tx.productExtra.deleteMany({
          where: { id: { in: deletedIds } },
        });
      }

      for (const item of productExtra) {
        if (item.id) {
          await tx.productExtra.update({
            where: { id: item.id },
            data: {
              ...(item.name && { name: item.name }),
              ...(item.price !== undefined && { price: item.price }),
            },
          });
        } else {
          await tx.productExtra.create({
            data: {
              productId: id,
              name: item.name || "Extra",
              price: item.price ?? 0,
            },
          });
        }
      }
    }
  });

  // Fetch and return the updated product
  const finalProduct = await prisma.product.findUnique({
    where: { id },
    include: productInclude,
  });

  return finalProduct;
};

const deleteProduct = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  // Soft delete product
  await prisma.product.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Product deleted successfully" };
};

export const ProductServices = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
