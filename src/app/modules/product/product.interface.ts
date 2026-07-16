import { AdjustmentType } from "@prisma/client";

export type ICreateProductSizeInput = {
  sizeId: string;
  name: string;
  oz: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type ICreateProductMilkInput = {
  milkId: string;
  name: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type ICreateProductExtraInput = {
  extraId: string;
  name: string;
  price: number;
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
  sizes?: ICreateProductSizeInput[];
  milks?: ICreateProductMilkInput[];
  extras?: ICreateProductExtraInput[];
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
  sizes?: ICreateProductSizeInput[];
  milks?: ICreateProductMilkInput[];
  extras?: ICreateProductExtraInput[];
};

export type IProductFilterableFields = {
  searchTerm?: string;
  categoryId?: string;
  minPrice?: string;
  maxPrice?: string;
  coin?: string;
};
