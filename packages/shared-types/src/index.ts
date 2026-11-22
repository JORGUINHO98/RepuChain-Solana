export interface HealthResponse {
  status: "ok";
  service: "repuchain-api";
  version: string;
}
export const PERMISSIONS = [
  "catalog:read", "catalog:write", "suppliers:read", "suppliers:write",
  "warehouses:read", "warehouses:write", "inventory:read", "inventory:write",
  "users:manage", "audit:read",
  "purchases:read", "purchases:write", "sales:read", "sales:write",
] as const;
export type PermissionCode = typeof PERMISSIONS[number];
export const DEFAULT_ROLES: Record<string, readonly PermissionCode[]> = {
  ADMIN: PERMISSIONS,
  MANAGER: PERMISSIONS.filter(p => p !== "users:manage"),
  OPERATOR: ["catalog:read", "suppliers:read", "warehouses:read", "inventory:read", "inventory:write", "purchases:read", "sales:read"],
  VIEWER: ["catalog:read", "suppliers:read", "warehouses:read", "inventory:read", "purchases:read", "sales:read"],
};
export interface AuthenticatedUser {
  id: string;
  companyId: string;
  sessionId: string;
  name: string;
  email: string;
  role: string;
  permissions: PermissionCode[];
}
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}

export type {Page,ProductDto,WarehouseDto,StockDto,BatchDto,EvidenceDto,DashboardDto} from "./mobile";
