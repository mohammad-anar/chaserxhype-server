import { ServiceChargeStatus } from "@prisma/client";

export type ICreateServiceChargePayload = {
  title: string;
  description?: string;
  amount: number;
  status?: ServiceChargeStatus;
};

export type IUpdateServiceChargePayload = {
  title?: string;
  description?: string;
  amount?: number;
  status?: ServiceChargeStatus;
};
