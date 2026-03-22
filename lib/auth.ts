export {};
import type { MockUser, UserRole } from "../types";

const users: Record<UserRole, MockUser> = {
  operator: {
    id: "u-1",
    name: "Operador 01",
    email: "operator@mock.com",
    badgeId: "OP-001",
    role: "operator",
  },
  ic: {
    id: "u-2",
    name: "IC Team 01",
    email: "ic@mock.com",
    badgeId: "IC-101",
    role: "ic",
  },
  manager: {
    id: "u-3",
    name: "Manager 01",
    email: "manager@mock.com",
    badgeId: "MG-900",
    role: "manager",
  },
  admin: {
    id: "u-4",
    name: "Admin 01",
    email: "admin@mock.com",
    badgeId: "AD-999",
    role: "admin",
  },
};

export function getMockUser(roleParam?: string | null): MockUser {
  const role = (roleParam || "admin") as UserRole;
  return users[role] ?? users.admin;
}
