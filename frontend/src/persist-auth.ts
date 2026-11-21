import { Capacitor } from "@capacitor/core";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
const COOKIE_MAX_CHARS = 3500;

export const WORKSPACE_STORAGE_KEY = "salon-crm-session-v1";
export const CUSTOMER_STORAGE_KEY = "salon-customer-session-v1";
export const TOKEN_STORAGE_KEY = "salon-crm-tokens-v1";

const WORKSPACE_COOKIE = "krios_ws";
const CUSTOMER_COOKIE = "krios_cs";
const TOKEN_COOKIE = "krios_tk";

const KEYS = [
  { storageKey: WORKSPACE_STORAGE_KEY, cookieName: WORKSPACE_COOKIE },
  { storageKey: CUSTOMER_STORAGE_KEY, cookieName: CUSTOMER_COOKIE },
  { storageKey: TOKEN_STORAGE_KEY, cookieName: TOKEN_COOKIE },
] as const;

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
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  if (value && value.length <= COOKIE_MAX_CHARS) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    return;
  }
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

async function nativePreferences() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const loaded = import("@capacitor/preferences").then((m) => m.Preferences);
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 1200);
    });
    return await Promise.race([loaded, timeout]);
  } catch {
    return null;
  }
}

function readLocal(storageKey: string): string | null {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function writeLocal(storageKey: string, raw: string | null) {
  try {
    if (raw) window.localStorage.setItem(storageKey, raw);
    else window.localStorage.removeItem(storageKey);
  } catch {
    /* quota / private mode */
  }
}

export function readPersistedRaw(storageKey: string, cookieName: string): string | null {
  const fromStorage = readLocal(storageKey);
  if (fromStorage && fromStorage !== "null") return fromStorage;
  const fromCookie = readCookie(cookieName);
  if (fromCookie && fromCookie !== "null") {
    writeLocal(storageKey, fromCookie);
    return fromCookie;
  }
  return null;
}

export function writePersistedRaw(storageKey: string, cookieName: string, raw: string | null) {
  writeLocal(storageKey, raw);
  writeCookie(cookieName, raw);
  void nativePreferences().then((prefs) => {
    if (!prefs) return;
    if (raw) return prefs.set({ key: storageKey, value: raw });
    return prefs.remove({ key: storageKey });
  });
}

export function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw || raw === "null") return null;
  try {
    const value = JSON.parse(raw) as T;
    if (!value || typeof value !== "object") return null;
    return value;
  } catch {
    return null;
  }
}

export function readPersistedJson<T>(storageKey: string, cookieName: string): T | null {
  return parseJson<T>(readPersistedRaw(storageKey, cookieName));
}

export function writePersistedJson(storageKey: string, cookieName: string, value: unknown | null) {
  writePersistedRaw(storageKey, cookieName, value ? JSON.stringify(value) : null);
}

export function hasPersistedRaw(storageKey: string) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return Boolean(raw && raw !== "null");
  } catch {
    return false;
  }
}

/** Restore native SharedPreferences (and cookies) into localStorage before routes run. */
export async function hydratePersistedAuth() {
  if (typeof window === "undefined") return;
  const prefs = await nativePreferences();
  for (const { storageKey, cookieName } of KEYS) {
    if (readLocal(storageKey)) continue;
    let raw: string | null = null;
    if (prefs) {
      try {
        raw = (await prefs.get({ key: storageKey })).value ?? null;
      } catch {
        raw = null;
      }
    }
    if (!raw) raw = readCookie(cookieName);
    if (raw && raw !== "null") writeLocal(storageKey, raw);
  }
}

export { WORKSPACE_COOKIE, CUSTOMER_COOKIE, TOKEN_COOKIE };
