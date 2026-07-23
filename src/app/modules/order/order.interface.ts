import { PayType } from "@prisma/client";

export interface IShippingAddress {
  fullName?: string;
  street1: string;
  state?: string;
  city: string;
  country: string;
  postalCode?: string;
  phone?: string;
}

export interface ICheckoutPayload {
  payType?: PayType;
  note?: string;
  shippingAddress?: IShippingAddress;
}
