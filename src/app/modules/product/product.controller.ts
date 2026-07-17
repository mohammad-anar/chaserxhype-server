import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync.js";
import sendResponse from "../../shared/sendResponse.js";
import { ProductServices } from "./product.service.js";
import { StatusCodes } from "http-status-codes";
import pick from "../../../helpers/pick.js";
import { getMultipleFilesPath } from "../../shared/getFilePath.js";
import { unlinkFiles } from "../../shared/unlinkFile.js";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const images = getMultipleFilesPath(req.files, "image");
  
  const body = { ...req.body };

  // Parse fields from form-data
  if (typeof body.basePrice === "string") body.basePrice = Number(body.basePrice);
  if (typeof body.coin === "string") body.coin = Number(body.coin);
  if (body.customOption === "true") body.customOption = true;
  if (body.customOption === "false") body.customOption = false;

  if (typeof body.productSize === "string") {
    try {
      body.productSize = JSON.parse(body.productSize);
    } catch (e) {
      body.productSize = [];
    }
  }
  if (typeof body.productMilk === "string") {
    try {
      body.productMilk = JSON.parse(body.productMilk);
    } catch (e) {
      body.productMilk = [];
    }
  }
  if (typeof body.productExtra === "string") {
    try {
      body.productExtra = JSON.parse(body.productExtra);
    } catch (e) {
      body.productExtra = [];
    }
  }

  const payload = {
    ...body,
    image: images || [],
  };

  try {
    const result = await ProductServices.createProduct(payload);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Product created successfully",
      data: result,
    });
  } catch (error) {
    // If creation fails, clean up uploaded files
    unlinkFiles(req.files);
    throw error;
  }
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["searchTerm", "categoryId", "minPrice", "maxPrice", "coin"]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await ProductServices.getAllProducts(filters, options);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductServices.getProductById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const images = getMultipleFilesPath(req.files, "image");
  
  const body = { ...req.body };

  // Parse fields from form-data
  if (typeof body.basePrice === "string") body.basePrice = Number(body.basePrice);
  if (typeof body.coin === "string") body.coin = Number(body.coin);
  if (body.customOption === "true") body.customOption = true;
  if (body.customOption === "false") body.customOption = false;

  if (typeof body.productSize === "string") {
    try {
      body.productSize = JSON.parse(body.productSize);
    } catch (e) {
      body.productSize = undefined;
    }
  }
  if (typeof body.productMilk === "string") {
    try {
      body.productMilk = JSON.parse(body.productMilk);
    } catch (e) {
      body.productMilk = undefined;
    }
  }
  if (typeof body.productExtra === "string") {
    try {
      body.productExtra = JSON.parse(body.productExtra);
    } catch (e) {
      body.productExtra = undefined;
    }
  }

  const payload = {
    ...body,
    ...(images && { image: images }),
  };

  try {
    const result = await ProductServices.updateProduct(id, payload);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  } catch (error) {
    unlinkFiles(req.files);
    throw error;
  }
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await ProductServices.deleteProduct(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
