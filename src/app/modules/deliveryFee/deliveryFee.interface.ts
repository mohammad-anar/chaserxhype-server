import { DeliveryFeeStatus } from "@prisma/client";

export type ICreateDeliveryFeePayload = {
  title: string;
  description?: string;
  amount: number;
  status?: DeliveryFeeStatus;
};

export type IUpdateDeliveryFeePayload = {
  title?: string;
  description?: string;
  amount?: number;
  status?: DeliveryFeeStatus;
};
