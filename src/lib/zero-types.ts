export const ZERO_STATUSES = ["new", "contacted", "offered", "declined"] as const;
export type ZeroStatus = (typeof ZERO_STATUSES)[number];

export const ZERO_STATUS_LABEL: Record<ZeroStatus, string> = {
  new: "New",
  contacted: "Contacted",
  offered: "Slot offered",
  declined: "Not a fit",
};

export type ZeroRegistration = {
  id: string;
  at: string;
  userId: string;
  name: string;
  email: string;
  company: string;
  annualVolume: string;
  product: string;
  notes: string;
  status: ZeroStatus;
  adminNote: string;
  updatedAt: string | null;
};
