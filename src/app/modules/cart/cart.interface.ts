export type IAddCartItemPayload = {
  productId?: string;
  coinProductId?: string;
  isCoinProduct: boolean;
  quantity: number;
  selectedSizeId?: string;
  selectedMildId?: string; // ProductMilk
  extras?: string[]; // array of productExtraId
};

export type IUpdateCartItemPayload = {
  quantity?: number;
  selectedSizeId?: string;
  selectedMildId?: string;
  extras?: string[];
};
