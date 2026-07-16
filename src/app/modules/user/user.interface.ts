export type ICreateUserPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  profileImage?: string;
};

export type IUserFilterableFields = {
  searchTerm?: string;
  role?: string;
  status?: string;
};

export type IUpdateUserProfilePayload = {
  name?: string;
  phone?: string;
  profileImage?: string;
};
