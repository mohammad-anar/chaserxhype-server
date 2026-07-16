export type ICreateSupportTicketPayload = {
  subject: string;
  message: string;
};

export type ISupportTicketFilterableFields = {
  searchTerm?: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
};
