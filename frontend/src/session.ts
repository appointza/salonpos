import type { EntityId } from "@/ids";
/** Workspace login session — shared by auth + tenant without circular imports. */

export const WORKSPACE_SESSION_KEY = "salon-crm-session-v1";
export const WORKSPACE_SESSION_EVENT = "workspace-session-changed";
export const CUSTOMER_SESSION_KEY = "salon-customer-session-v1";
export const CUSTOMER_SESSION_EVENT = "customer-session-changed";

const WORKSPACE_COOKIE = "krios_ws";
const CUSTOMER_COOKIE = "krios_cs";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

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

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw || raw === "null") return null;
  try {
    const value = JSON.parse(raw) as T;
    if (!value || typeof value !== "object") return null;
    return value;
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

function writeCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
    return;
  }
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readPersisted<T>(storageKey: string, cookieName: string): T | null {
  try {
    const fromStorage = parseJson<T>(window.localStorage.getItem(storageKey));
    if (fromStorage) return fromStorage;
    const fromCookie = parseJson<T>(readCookie(cookieName));
    if (fromCookie) {
      window.localStorage.setItem(storageKey, JSON.stringify(fromCookie));
      return fromCookie;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writePersisted(storageKey: string, cookieName: string, value: unknown | null) {
  try {
    if (value) {
      const raw = JSON.stringify(value);
      window.localStorage.setItem(storageKey, raw);
      writeCookie(cookieName, raw);
    } else {
      window.localStorage.removeItem(storageKey);
      writeCookie(cookieName, null);
    }
  } catch {
    /* ignore */
  }
}

export function readWorkspaceSession(): WorkspaceSession | null {
  const session = readPersisted<WorkspaceSession>(WORKSPACE_SESSION_KEY, WORKSPACE_COOKIE);
  if (!session?.email || !session.role) return null;
  return session;
}

export function writeWorkspaceSession(session: WorkspaceSession | null) {
  writePersisted(WORKSPACE_SESSION_KEY, WORKSPACE_COOKIE, session);
  dispatchWorkspaceSessionChange();
}

export function dispatchWorkspaceSessionChange() {
  window.dispatchEvent(new Event(WORKSPACE_SESSION_EVENT));
}

export function readCustomerSession(): StoredCustomerSession | null {
  const session = readPersisted<StoredCustomerSession>(CUSTOMER_SESSION_KEY, CUSTOMER_COOKIE);
  if (!session?.phone || !session.name) return null;
  return session;
}

export function writeCustomerSession(session: StoredCustomerSession | null) {
  writePersisted(CUSTOMER_SESSION_KEY, CUSTOMER_COOKIE, session);
  window.dispatchEvent(new Event(CUSTOMER_SESSION_EVENT));
}

export function workspaceHomePath(role: string | undefined): "/platform" | "/dashboard" {
  return role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
}
