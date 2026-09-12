export interface ICreateIngredientPayload {
  name: string;
  unit: string;
  currentStock: number;
  reservedStock?: number;
  minStockLevel?: number;
  isAvailable?: boolean;
}

export interface IUpdateIngredientPayload {
  name?: string;
  unit?: string;
  currentStock?: number;
  reservedStock?: number;
  minStockLevel?: number;
  isAvailable?: boolean;
}

export interface IRestockPayload {
  quantity: number;
  reason?: string;
}

export interface IIngredientFilterableFields {
  searchTerm?: string;
  isAvailable?: boolean;
  lowStock?: boolean;
}
