import { PayType } from "@prisma/client";

export interface ICheckoutPayload {
  payType?: PayType;
  note?: string;
}
