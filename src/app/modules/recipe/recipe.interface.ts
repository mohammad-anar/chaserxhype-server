export interface IRecipeItemPayload {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface ISetProductRecipePayload {
  productId: string;
  items: IRecipeItemPayload[];
}

export interface IAddRecipeItemPayload {
  productId: string;
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface IUpdateRecipeItemPayload {
  quantity?: number;
  unit?: string;
}
