export type IVerifyOtpPayload = {
  email: string;
  otp: string | number;
};

export type IForgotPasswordPayload = {
  email: string;
};

export type IResetPasswordPayload = {
  email: string;
  otp: string | number;
  newPassword?: string;
  password?: string;
};

export type IResendOtpPayload = {
  email: string;
};
