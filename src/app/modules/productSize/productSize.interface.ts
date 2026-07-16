import { AdjustmentType } from "@prisma/client";

export type ICreateProductSizePayload = {
  productId: string;
  sizeId: string;
  name: string;
  oz: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type IUpdateProductSizePayload = {
  name?: string;
  oz?: string;
  priceAdjustment?: number;
  adjustmentType?: AdjustmentType;
};
