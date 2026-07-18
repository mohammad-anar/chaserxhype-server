export type ICreateProductExtraPayload = {
  productId: string;
  name: string;
  price: number;
};

export type IUpdateProductExtraPayload = {
  name?: string;
  price?: number;
};
