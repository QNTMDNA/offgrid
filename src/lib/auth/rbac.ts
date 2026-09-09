import type { AdminRole } from "@prisma/client";

/**
 * Capabilities are coarse-grained on purpose: one per admin surface plus a
 * write flag, so a page can ask `can(role, "crm:write")` without knowing roles.
 */
export const CAPABILITIES = [
  "crm:read",
  "crm:write",
  "commerce:read",
  "commerce:write",
  "catalog:read",
  "catalog:write",
  "partners:read",
  "partners:write",
  "payouts:read",
  "payouts:write",
  "marketing:read",
  "marketing:write",
  "investors:read",
  "investors:write",
  "settings:write",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Investor material is board-level, so it is granted explicitly rather than
 * riding along with the general read capabilities. */
const READ_ONLY: Capability[] = CAPABILITIES.filter(
  (c) => c.endsWith(":read") && !c.startsWith("investors:"),
);

const GRANTS: Record<AdminRole, readonly Capability[]> = {
  ADMIN: CAPABILITIES,
  SALES: [...READ_ONLY, "crm:write", "commerce:write"],
  OPERATIONS: [...READ_ONLY, "commerce:write", "catalog:write", "partners:write", "payouts:write"],
  MARKETING: [...READ_ONLY, "marketing:write", "crm:write"],
  READ_ONLY,
};

export function can(role: AdminRole, capability: Capability): boolean {
  return GRANTS[role].includes(capability);
}
