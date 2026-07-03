import "server-only";

import { getStorage, isR2Configured } from "./storage";

/**
 * Total bytes a company has uploaded through the content studio. Measured
 * straight from the bucket via the org-scoped key prefixes
 * (`uploads/org/<orgId>/`, `images/org/<orgId>/`) — no bookkeeping table to
 * drift out of sync.
 */
export async function getOrgStorageUsage(orgId: string): Promise<number> {
  if (!isR2Configured()) return 0;
  const storage = getStorage();
  const lists = await Promise.all([
    storage.listObjects(`uploads/org/${orgId}/`),
    storage.listObjects(`images/org/${orgId}/`),
  ]);
  return lists.flat().reduce((sum, obj) => sum + obj.size, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}
