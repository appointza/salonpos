import type { EntityId } from "@/ids";
import {
  CUSTOMER_COOKIE,
  CUSTOMER_STORAGE_KEY,
  WORKSPACE_COOKIE,
  WORKSPACE_STORAGE_KEY,
  readPersistedJson,
  writePersistedJson,
} from "@/persist-auth";

/** Workspace login session — shared by auth + tenant without circular imports. */

export const WORKSPACE_SESSION_KEY = WORKSPACE_STORAGE_KEY;
export const WORKSPACE_SESSION_EVENT = "workspace-session-changed";
export const CUSTOMER_SESSION_KEY = CUSTOMER_STORAGE_KEY;
export const CUSTOMER_SESSION_EVENT = "customer-session-changed";

export type WorkspaceRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "STYLIST";

export type WorkspaceSession = {
  id: EntityId;
  orgId: EntityId | null;
  name: string;
  email: string;
  phone: string;
  role: WorkspaceRole;
  language?: string;
  staffId?: EntityId;
  locationId?: EntityId;
};

export type StoredCustomerSession = { userId?: number; name: string; phone: string; since: string };

export function readWorkspaceSession(): WorkspaceSession | null {
  const session = readPersistedJson<WorkspaceSession>(WORKSPACE_SESSION_KEY, WORKSPACE_COOKIE);
  if (!session?.email || !session.role) return null;
  return session;
}

export function writeWorkspaceSession(session: WorkspaceSession | null) {
  writePersistedJson(WORKSPACE_SESSION_KEY, WORKSPACE_COOKIE, session);
  dispatchWorkspaceSessionChange();
}

export function dispatchWorkspaceSessionChange() {
  window.dispatchEvent(new Event(WORKSPACE_SESSION_EVENT));
}

export function readCustomerSession(): StoredCustomerSession | null {
  const session = readPersistedJson<StoredCustomerSession>(CUSTOMER_SESSION_KEY, CUSTOMER_COOKIE);
  if (!session?.phone || !session.name) return null;
  return session;
}

export function writeCustomerSession(session: StoredCustomerSession | null) {
  writePersistedJson(CUSTOMER_SESSION_KEY, CUSTOMER_COOKIE, session);
  window.dispatchEvent(new Event(CUSTOMER_SESSION_EVENT));
}

export function workspaceHomePath(role: string | undefined): "/platform" | "/dashboard" {
  return role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
}
