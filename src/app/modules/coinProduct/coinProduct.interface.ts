export type ICreateCoinProductPayload = {
  productId: string;
  needPoint: number;
};

export type IUpdateCoinProductPayload = {
  productId?: string;
  needPoint?: number;
};

export type ICoinProductFilterableFields = {
  searchTerm?: string;
};
