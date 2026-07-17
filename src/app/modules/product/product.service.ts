import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import slugify from "slugify";
import { paginationHelper } from "../../../helpers/paginationHelper.js";
import { Prisma } from "@prisma/client";
import { ICreateProductPayload, IProductFilterableFields, IUpdateProductPayload } from "./product.interface.js";

const createProduct = async (payload: ICreateProductPayload) => {
  const { productSize, productMilk, productExtra, name, ...productData } = payload;

  const slug = slugify(name, { lower: true, strict: true }) + "-" + Date.now();

  const result = await prisma.$transaction(async (tx) => {
    // Create Product
    const product = await tx.product.create({
      data: {
        ...productData,
        slug,
      },
    });

    // Create ProductSizes (pull names dynamically from master list)
    if (productSize && productSize.length > 0) {
      const sizeItems = [];
      for (const item of productSize) {
        const sizeRecord = await tx.size.findUnique({
          where: { id: item.sizeId },
        });
        if (!sizeRecord) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Size with ID ${item.sizeId} not found`);
        }
        sizeItems.push({
          productId: product.id,
          sizeId: item.sizeId,
          name: sizeRecord.name, // Pulled from Size model
          oz: item.oz,
          priceAdjustment: item.priceAdjustment,
          adjustmentType: item.adjustmentType,
        });
      }
      await tx.productSize.createMany({
        data: sizeItems,
      });
    }

    // Create ProductMilks (pull names dynamically from master list)
    if (productMilk && productMilk.length > 0) {
      const milkItems = [];
      for (const item of productMilk) {
        const milkRecord = await tx.milk.findUnique({
          where: { id: item.milkId },
        });
        if (!milkRecord) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Milk with ID ${item.milkId} not found`);
        }
        milkItems.push({
          productId: product.id,
          milkId: item.milkId,
          name: milkRecord.name, // Pulled from Milk model
          priceAdjustment: item.priceAdjustment,
          adjustmentType: item.adjustmentType,
        });
      }
      await tx.productMilk.createMany({
        data: milkItems,
      });
    }

    // Create ProductExtras (pull names dynamically from master list)
    if (productExtra && productExtra.length > 0) {
      const extraItems = [];
      for (const item of productExtra) {
        const extraRecord = await tx.extra.findUnique({
          where: { id: item.extraId },
        });
        if (!extraRecord) {
          throw new ApiError(StatusCodes.NOT_FOUND, `Extra option with ID ${item.extraId} not found`);
        }
        extraItems.push({
          productId: product.id,
          extraId: item.extraId,
          name: extraRecord.name, // Pulled from Extra model
          price: item.price,
        });
      }
      await tx.productExtra.createMany({
        data: extraItems,
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
  const { productSize, productMilk, productExtra, name, ...productData } = payload;

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

    // Update sizes in-place if provided (only update by ID, cannot delete/recreate)
    if (productSize !== undefined && productSize.length > 0) {
      for (const item of productSize) {
        const sizeRecord = await tx.productSize.findFirst({
          where: { id: item.id, productId: id },
        });
        if (!sizeRecord) {
          throw new ApiError(
            StatusCodes.NOT_FOUND,
            `ProductSize record with ID ${item.id} not found for this product`
          );
        }
        await tx.productSize.update({
          where: { id: item.id },
          data: {
            oz: item.oz,
            priceAdjustment: item.priceAdjustment,
            adjustmentType: item.adjustmentType,
          },
        });
      }
    }

    // Update milks in-place if provided
    if (productMilk !== undefined && productMilk.length > 0) {
      for (const item of productMilk) {
        const milkRecord = await tx.productMilk.findFirst({
          where: { id: item.id, productId: id },
        });
        if (!milkRecord) {
          throw new ApiError(
            StatusCodes.NOT_FOUND,
            `ProductMilk record with ID ${item.id} not found for this product`
          );
        }
        await tx.productMilk.update({
          where: { id: item.id },
          data: {
            priceAdjustment: item.priceAdjustment,
            adjustmentType: item.adjustmentType,
          },
        });
      }
    }

    // Update extras in-place if provided
    if (productExtra !== undefined && productExtra.length > 0) {
      for (const item of productExtra) {
        const extraRecord = await tx.productExtra.findFirst({
          where: { id: item.id, productId: id },
        });
        if (!extraRecord) {
          throw new ApiError(
            StatusCodes.NOT_FOUND,
            `ProductExtra record with ID ${item.id} not found for this product`
          );
        }
        await tx.productExtra.update({
          where: { id: item.id },
          data: {
            price: item.price,
          },
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
