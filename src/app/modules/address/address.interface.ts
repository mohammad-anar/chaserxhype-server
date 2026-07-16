export type ICreateAddressPayload = {
  street1: string;
  street2?: string;
  state: string;
  city: string;
  country: string;
};

export type IUpdateAddressPayload = {
  street1?: string;
  street2?: string;
  state?: string;
  city?: string;
  country?: string;
};
