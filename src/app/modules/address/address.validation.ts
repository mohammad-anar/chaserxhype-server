import { z } from "zod";

const createAddressZodSchema = z.object({
  street1: z.string({
    message: "Street 1 is required",
  }),
  street2: z.string().optional(),
  state: z.string({
    message: "State is required",
  }),
  city: z.string({
    message: "City is required",
  }),
  country: z.string({
    message: "Country is required",
  }),
});

const updateAddressZodSchema = z.object({
  street1: z.string().optional(),
  street2: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export const AddressValidation = {
  createAddressZodSchema,
  updateAddressZodSchema,
};
