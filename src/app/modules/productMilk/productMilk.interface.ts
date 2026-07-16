import { AdjustmentType } from "@prisma/client";

export type ICreateProductMilkPayload = {
  productId: string;
  milkId: string;
  name: string;
  priceAdjustment: number;
  adjustmentType: AdjustmentType;
};

export type IUpdateProductMilkPayload = {
  name?: string;
  priceAdjustment?: number;
  adjustmentType?: AdjustmentType;
};
