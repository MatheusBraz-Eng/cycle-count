export type InventoryUpload = {
  id: string;
  uploaded_by: string;
  file_name: string;
  created_at: string;
  upload_type: "inventory" | "saldo_dac";
};
export {};
