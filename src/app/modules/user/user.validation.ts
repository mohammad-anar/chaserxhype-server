import { z } from "zod";

const createUserZodSchema = z.object({
  name: z.string({
    message: "Name is required",
  }),
  email: z.email("Invalid email format"),
  phone: z.string().optional(),
  password: z
    .string({
      message: "Password is required",
    })
    .min(6, "Password must be at least 6 characters"),
  profileImage: z.string().optional(),
});

const updateUserProfileZodSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  profileImage: z.string().optional(),
});

const updateUserStatusZodSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"], {
    message: "Status is required",
  }),
});

export const UserValidation = {
  createUserZodSchema,
  updateUserProfileZodSchema,
  updateUserStatusZodSchema,
};
