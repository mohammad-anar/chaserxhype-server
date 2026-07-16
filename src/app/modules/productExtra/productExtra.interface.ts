export type ICreateProductExtraPayload = {
  productId: string;
  extraId: string;
  name: string;
  price: number;
};

export type IUpdateProductExtraPayload = {
  name?: string;
  price?: number;
};
