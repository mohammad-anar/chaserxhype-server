import { GiftCardStatus, GiftCardTxType, OrderStatus, PaymentStatus } from "@prisma/client";

export interface ICreateGiftCardPayload {
  designIndex?: number;
  amount: number;
  recipientName: string;
  recipientEmail: string;
  personalMessage?: string;
  nickname?: string;
}

export interface ICreateGiftCardOrderPayload {
  designIndex?: number;
  amount: number;
  recipientName: string;
  recipientEmail: string;
  personalMessage?: string;
  nickname?: string;
}

export interface IRedeemGiftCardPayload {
  code: string;
}

export interface IUpdateGiftCardPayload {
  nickname?: string;
  isActive?: boolean;
}

export interface IAdminAddFundsPayload {
  giftCardId?: string;
  userId?: string;
  email?: string;
  amount: number;
  reason?: string;
}

export interface IGiftCardFilterableFields {
  searchTerm?: string;
  status?: GiftCardStatus;
  isClaimed?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface IGiftCardOrderFilterableFields {
  searchTerm?: string;
  paymentStatus?: PaymentStatus;
  orderStatus?: OrderStatus;
  startDate?: string;
  endDate?: string;
}
