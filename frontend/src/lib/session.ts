import type { EntityId } from "@/lib/ids";
/** Workspace login session — shared by auth + tenant without circular imports. */

export const WORKSPACE_SESSION_KEY = "salon-crm-session-v1";
export const WORKSPACE_SESSION_EVENT = "workspace-session-changed";

export type WorkspaceRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "STYLIST";

export type WorkspaceSession = {
  id: string;
  orgId: EntityId | null;
  name: string;
  email: string;
  phone: string;
  role: WorkspaceRole;
  staffId?: string;
  locationId?: EntityId;
};

export function readWorkspaceSession(): WorkspaceSession | null {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SESSION_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceSession) : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceSession(session: WorkspaceSession | null) {
  try {
    if (session) window.localStorage.setItem(WORKSPACE_SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(WORKSPACE_SESSION_KEY);
  } catch {
    /* ignore */
  }
  dispatchWorkspaceSessionChange();
}

export function dispatchWorkspaceSessionChange() {
  window.dispatchEvent(new Event(WORKSPACE_SESSION_EVENT));
}
