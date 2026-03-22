import { InventoryUpload } from "@/types";

export const mockUploads: InventoryUpload[] = [
  {
    id: "1",
    uploaded_by: "user-1",
    file_name: "estoque.xlsx",
    created_at: new Date().toISOString(),
    upload_type: "inventory",
  },
];
export {};
