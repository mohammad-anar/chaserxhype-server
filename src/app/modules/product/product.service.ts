import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import slugify from "slugify";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import { ICreateProductPayload, IProductFilterableFields, IUpdateProductPayload } from "./product.interface.js";

const createProduct = async (payload: ICreateProductPayload) => {
  const { sizes, milks, extras, name, ...productData } = payload;

  const slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();

  const result = await prisma.$transaction(async (tx) => {
    // Create Product
    const product = await tx.product.create({
      data: {
        ...productData,
        slug,
      },
    });

    // Create ProductSizes
    if (sizes && sizes.length > 0) {
      await tx.productSize.createMany({
        data: sizes.map((size) => ({
          productId: product.id,
          sizeId: size.sizeId,
          name: size.name,
          oz: size.oz,
          priceAdjustment: size.priceAdjustment,
          adjustmentType: size.adjustmentType,
        })),
      });
    }

    // Create ProductMilks
    if (milks && milks.length > 0) {
      await tx.productMilk.createMany({
        data: milks.map((milk) => ({
          productId: product.id,
          milkId: milk.milkId,
          name: milk.name,
          priceAdjustment: milk.priceAdjustment,
          adjustmentType: milk.adjustmentType,
        })),
      });
    }

    // Create ProductExtras
    if (extras && extras.length > 0) {
      await tx.productExtra.createMany({
        data: extras.map((extra) => ({
          productId: product.id,
          extraId: extra.extraId,
          name: extra.name,
          price: extra.price,
        })),
      });
    }

    return product;
  });

  // Return product with associations
  const finalProduct = await prisma.product.findUnique({
    where: { id: result.id },
    include: {
      productSizes: true,
      productMilks: true,
      productExtras: true,
      category: {
        select: {
          name: true,
        },
      },
    },
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

  // Custom sort mapper (e.g. created_at -> createdAt)
  let orderConfig: any = {};
  if (sortBy.toLowerCase() === "createdat" || sortBy.toLowerCase() === "created_at") {
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
    include: {
      productSizes: true,
      productMilks: true,
      productExtras: true,
      category: {
        select: {
          name: true,
        },
      },
    },
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
    include: {
      productSizes: true,
      productMilks: true,
      productExtras: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  return product;
};

const updateProduct = async (id: string, payload: IUpdateProductPayload) => {
  const { sizes, milks, extras, name, ...productData } = payload;

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product || product.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  const updatedData: Prisma.ProductUpdateInput = { ...productData };

  if (name) {
    updatedData.slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();
  }

  await prisma.$transaction(async (tx) => {
    // Update basic product details
    await tx.product.update({
      where: { id },
      data: updatedData,
    });

    // Overwrite sizes if provided
    if (sizes !== undefined) {
      await tx.productSize.deleteMany({ where: { productId: id } });
      if (sizes.length > 0) {
        await tx.productSize.createMany({
          data: sizes.map((size) => ({
            productId: id,
            sizeId: size.sizeId,
            name: size.name,
            oz: size.oz,
            priceAdjustment: size.priceAdjustment,
            adjustmentType: size.adjustmentType,
          })),
        });
      }
    }

    // Overwrite milks if provided
    if (milks !== undefined) {
      await tx.productMilk.deleteMany({ where: { productId: id } });
      if (milks.length > 0) {
        await tx.productMilk.createMany({
          data: milks.map((milk) => ({
            productId: id,
            milkId: milk.milkId,
            name: milk.name,
            priceAdjustment: milk.priceAdjustment,
            adjustmentType: milk.adjustmentType,
          })),
        });
      }
    }

    // Overwrite extras if provided
    if (extras !== undefined) {
      await tx.productExtra.deleteMany({ where: { productId: id } });
      if (extras.length > 0) {
        await tx.productExtra.createMany({
          data: extras.map((extra) => ({
            productId: id,
            extraId: extra.extraId,
            name: extra.name,
            price: extra.price,
          })),
        });
      }
    }
  });

  // Fetch and return the updated product
  const finalProduct = await prisma.product.findUnique({
    where: { id },
    include: {
      productSizes: true,
      productMilks: true,
      productExtras: true,
      category: {
        select: {
          name: true,
        },
      },
    },
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
