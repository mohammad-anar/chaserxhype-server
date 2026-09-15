import { PointTxType } from "@prisma/client";

export interface IProcessLoyaltyPointsPayload {
  loyaltyCode: string;
  points: number; // positive for addition, negative for deduction
  type?: PointTxType;
  reason?: string;
}

export interface ILoyaltyFilterableFields {
  searchTerm?: string;
  type?: PointTxType;
  startDate?: string;
  endDate?: string;
}
