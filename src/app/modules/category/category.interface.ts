export type ICreateCategoryPayload = {
  name: string;
  isActive?: boolean;
};

export type IUpdateCategoryPayload = {
  name?: string;
  isActive?: boolean;
};
