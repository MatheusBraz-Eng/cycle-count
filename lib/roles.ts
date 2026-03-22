export {};
import type { UserRole } from "../types";

export const rolePermissions: Record<UserRole, string[]> = {
  operator: ["/dashboard", "/count", "/recount"],
  ic: ["/dashboard", "/ic", "/recount"],
  manager: ["/dashboard", "/manager"],
  admin: ["/dashboard", "/count", "/recount", "/ic", "/manager", "/settings"],
};

export function canAccess(role: UserRole, path: string) {
  if (role === "admin") return true;
  return rolePermissions[role].includes(path);
}
