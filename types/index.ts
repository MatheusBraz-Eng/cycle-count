export type InventoryUpload = {
  id: string;
  uploaded_by: string;
  file_name: string;
  created_at: string;
  upload_type: "inventory" | "saldo_dac";
};
export {};
export type UserRole = "operator" | "ic" | "manager" | "admin";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  badgeId: string;
  role: UserRole;
};

export type UploadType = "inventory" | "saldo_dac";

export type UploadRecord = {
  id: string;
  fileName: string;
  uploadType: UploadType;
  uploadedBy: string;
  createdAt: string;
};

export type CountMode = "mop" | "linha";

export type CountRecord = {
  id: string;
  location: string;
  pn: string;
  quantity: number;
  counterBadge: string;
  comments?: string;
  countMode?: CountMode;
  status: "counted" | "divergent" | "approved";
  createdAt: string;
};

export type RecountRequest = {
  id: string;
  location: string;
  pn: string;
  expectedQty: number;
  countedQty: number;
  firstCounterBadge: string;
  recountBadge?: string;
  comments?: string;
  status: "pending" | "approved" | "rejected";
};

export type OperatorPerformance = {
  badgeId: string;
  name: string;
  counts: number;
  divergences: number;
  accuracy: number;
  averageTimeMinutes: number;
};

export type HrmCageRow = {
  pn: string;
  gaveta: string;
  quantidade: number;
};

export type HrmCageCompareResult = {
  key: string;
  pn: string;
  gaveta: string;
  counted: number;
  saldoDac: number;
  difference: number;
  status: "ok" | "divergent";
};
