import type { Request } from "express";
import type { Action, Language, Resource } from "@motorcycle-system/shared-types";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  branchId: string | null;
  lang: Language;
  permissions: Array<{ resource: Resource; action: Action }>;
  isSuperAdmin: boolean;
  isCustomer: boolean;
  customerId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
