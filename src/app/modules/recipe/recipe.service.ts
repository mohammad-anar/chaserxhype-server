import { prisma } from "../../../helpers/prisma.js";
import ApiError from "../../../errors/ApiError.js";
import { StatusCodes } from "http-status-codes";
import {
  IAddRecipeItemPayload,
  ISetProductRecipePayload,
  IUpdateRecipeItemPayload,
} from "./recipe.interface.js";

const setProductRecipe = async (payload: ISetProductRecipePayload) => {
  const { productId, items } = payload;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  // Validate that all ingredients exist
  const ingredientIds = items.map((i) => i.ingredientId);
  const foundIngredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
  });

  if (foundIngredients.length !== ingredientIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "One or more ingredients do not exist");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Delete existing recipe items for this product
    await tx.productRecipe.deleteMany({
      where: { productId },
    });

    // Insert new recipe items
    await tx.productRecipe.createMany({
      data: items.map((item) => ({
        productId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unit: item.unit,
      })),
    });

    return await tx.productRecipe.findMany({
      where: { productId },
      include: {
        ingredient: true,
      },
    });
  });

  return result;
};

const getProductRecipe = async (productId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true, basePrice: true },
  });

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  const recipes = await prisma.productRecipe.findMany({
    where: { productId },
    include: {
      ingredient: true,
    },
  });

  return {
    product,
    recipes,
  };
};

const addRecipeItem = async (payload: IAddRecipeItemPayload) => {
  const { productId, ingredientId, quantity, unit } = payload;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
  }

  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ingredient not found");
  }

  const result = await prisma.productRecipe.upsert({
    where: {
      productId_ingredientId: {
        productId,
        ingredientId,
      },
    },
    update: {
      quantity,
      unit,
    },
    create: {
      productId,
      ingredientId,
      quantity,
      unit,
    },
    include: {
      ingredient: true,
      product: {
        select: { id: true, name: true },
      },
    },
  });

  return result;
};

const updateRecipeItem = async (id: string, payload: IUpdateRecipeItemPayload) => {
  const recipe = await prisma.productRecipe.findUnique({ where: { id } });
  if (!recipe) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Recipe item not found");
  }

  const result = await prisma.productRecipe.update({
    where: { id },
    data: payload,
    include: {
      ingredient: true,
    },
  });

  return result;
};

const deleteRecipeItem = async (id: string) => {
  const recipe = await prisma.productRecipe.findUnique({ where: { id } });
  if (!recipe) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Recipe item not found");
  }

  const result = await prisma.productRecipe.delete({
    where: { id },
  });

  return result;
};

const getAllRecipes = async () => {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: {
      id: true,
      name: true,
      slug: true,
      productRecipes: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  return products;
};

export const RecipeServices = {
  setProductRecipe,
  getProductRecipe,
  addRecipeItem,
  updateRecipeItem,
  deleteRecipeItem,
  getAllRecipes,
};
