import { z } from "zod";

const loginZodSchema = z.object({
  email: z
    .string({
      message: "Email is required",
    })
    .email("Invalid email format"),
  password: z
    .string({
      message: "Password is required",
    }),
});

const changePasswordZodSchema = z
  .object({
    oldPassword: z
      .string({
        message: "Old password is required",
      }),
    newPassword: z
      .string({
        message: "New password is required",
      })
      .min(6, "New password must be at least 6 characters"),
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password cannot be the same as the old password",
    path: ["newPassword"],
  });

const verifyEmailZodSchema = z.object({
  email: z
    .string({
      message: "Email is required",
    })
    .email("Invalid email format"),
  otp: z.union([z.string(), z.number()], {
    message: "OTP code is required",
  }),
});

const forgotPasswordZodSchema = z.object({
  email: z
    .string({
      message: "Email is required",
    })
    .email("Invalid email format"),
});

const verifyOtpZodSchema = z.object({
  email: z
    .string({
      message: "Email is required",
    })
    .email("Invalid email format"),
  otp: z.union([z.string(), z.number()], {
    message: "OTP code is required",
  }),
});

const resetPasswordZodSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  resetToken: z.string().optional(),
}).refine(data => data.password || data.newPassword, {
  message: "Either password or newPassword must be provided",
  path: ["password"],
});

const resendOtpZodSchema = z.object({
  email: z
    .string({
      message: "Email is required",
    })
    .email("Invalid email format"),
});

const refreshTokenZodSchema = z.object({
  refreshToken: z.string({
    message: "Refresh token is required",
  }).optional(),
});

export const AuthValidation = {
  loginZodSchema,
  changePasswordZodSchema,
  verifyEmailZodSchema,
  forgotPasswordZodSchema,
  verifyOtpZodSchema,
  resetPasswordZodSchema,
  resendOtpZodSchema,
  refreshTokenZodSchema,
};

