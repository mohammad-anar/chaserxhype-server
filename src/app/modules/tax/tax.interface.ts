import { TaxStatus, TaxType } from "@prisma/client";

export type ICreateTaxPayload = {
  title: string;
  description?: string;
  amount: number;
  type: TaxType;
  status?: TaxStatus;
};

export type IUpdateTaxPayload = {
  title?: string;
  description?: string;
  amount?: number;
  type?: TaxType;
  status?: TaxStatus;
};
