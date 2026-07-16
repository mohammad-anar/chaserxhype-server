export type ICreateCoinProductPayload = {
  name: string;
  needPoint: number;
};

export type IUpdateCoinProductPayload = {
  name?: string;
  needPoint?: number;
};

export type ICoinProductFilterableFields = {
  searchTerm?: string;
};
