import { AdjustmentType } from "@prisma/client";

export type ICreateProductSizeInput = {
  name: string;
  oz: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type ICreateProductMilkInput = {
  name: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type ICreateProductExtraInput = {
  name: string;
  price: number;
};

export type IUpdateProductSizeInput = {
  id: string; // Required to target the specific variation record
  name?: string;
  oz?: string;
  priceAdjustment?: number;
  adjustmentType?: AdjustmentType;
};

export type IUpdateProductMilkInput = {
  id: string; // Required to target the specific variation record
  name?: string;
  priceAdjustment?: number;
  adjustmentType?: AdjustmentType;
};

export type IUpdateProductExtraInput = {
  id: string; // Required to target the specific variation record
  name?: string;
  price?: number;
};

export type ICreateProductPayload = {
  name: string; // Used to generate slug
  categoryId: string;
  shortDescription: string;
  description: string;
  basePrice: number;
  coin: number;
  customOption?: boolean;
  image?: string[];
  productSize?: ICreateProductSizeInput[];
  productMilk?: ICreateProductMilkInput[];
  productExtra?: ICreateProductExtraInput[];
};

export type IUpdateProductPayload = {
  name?: string;
  categoryId?: string;
  shortDescription?: string;
  description?: string;
  basePrice?: number;
  coin?: number;
  customOption?: boolean;
  image?: string[];
  productSize?: IUpdateProductSizeInput[];
  productMilk?: IUpdateProductMilkInput[];
  productExtra?: IUpdateProductExtraInput[];
};

export type IProductFilterableFields = {
  searchTerm?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  coin?: string;
};
