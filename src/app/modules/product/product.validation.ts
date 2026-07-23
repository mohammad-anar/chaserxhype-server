import { z } from "zod";

const preprocessArray = (val: unknown) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

const preprocessNumber = (val: unknown) => {
  if (typeof val === "string" && val.trim() !== "") {
    const num = Number(val);
    return isNaN(num) ? val : num;
  }
  return val;
};

const preprocessBoolean = (val: unknown) => {
  if (val === "true") return true;
  if (val === "false") return false;
  return val;
};

const createProductZodSchema = z.object({
  name: z.string({
    message: "Product name is required",
  }),
  categoryId: z.string({
    message: "Category ID is required",
  }),
  shortDescription: z.string({
    message: "Short description is required",
  }),
  description: z.string({
    message: "Description is required",
  }),
  basePrice: z.preprocess(
    preprocessNumber,
    z.number({ message: "Base price is required and must be a number" })
  ),
  coin: z.preprocess(
    preprocessNumber,
    z.number({ message: "Coin value is required and must be a number" })
  ),
  customOption: z.preprocess(preprocessBoolean, z.boolean().optional()),
  image: z.preprocess(preprocessArray, z.array(z.string()).optional()),
  productSize: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string({ message: "Size name is required" }),
        oz: z.string({ message: "Ounces is required" }),
        priceAdjustment: z.preprocess(
          preprocessNumber,
          z.number({ message: "Price adjustment must be a number" })
        ),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    ).optional()
  ),
  productMilk: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string({ message: "Milk name is required" }),
        priceAdjustment: z.preprocess(
          preprocessNumber,
          z.number({ message: "Price adjustment must be a number" })
        ),
        adjustmentType: z.enum(["ADD", "SUBTRACT"], {
          message: "Adjustment type must be ADD or SUBTRACT",
        }),
      })
    ).optional()
  ),
  productExtra: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string({ message: "Extra name is required" }),
        price: z.preprocess(
          preprocessNumber,
          z.number({ message: "Price must be a number" })
        ),
      })
    ).optional()
  ),
});

const updateProductZodSchema = z.object({
  name: z.string().optional(),
  categoryId: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  basePrice: z.preprocess(preprocessNumber, z.number().optional()),
  coin: z.preprocess(preprocessNumber, z.number().optional()),
  customOption: z.preprocess(preprocessBoolean, z.boolean().optional()),
  image: z.preprocess(preprocessArray, z.array(z.string()).optional()),
  productSize: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        oz: z.string().optional(),
        priceAdjustment: z.preprocess(preprocessNumber, z.number().optional()),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    ).optional()
  ),
  productMilk: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        priceAdjustment: z.preprocess(preprocessNumber, z.number().optional()),
        adjustmentType: z.enum(["ADD", "SUBTRACT"]).optional(),
      })
    ).optional()
  ),
  productExtra: z.preprocess(
    preprocessArray,
    z.array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        price: z.preprocess(preprocessNumber, z.number().optional()),
      })
    ).optional()
  ),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
};
