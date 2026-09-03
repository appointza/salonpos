import type { Role } from "@/lib/auth";

export type AccountType = "customer" | "organization";

export type StoredAccount = {
  identifier: string; // normalized email or phone digits
  type: AccountType;
  name: string;
  email?: string;
  phone?: string;
  role?: Role;
};

const KEY = "salon-accounts-v1";

export function normalizeIdentifier(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : trimmed;
}

export function listAccounts(): StoredAccount[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

export function saveAccount(account: Omit<StoredAccount, "identifier"> & { identifier: string }): StoredAccount {
  const next: StoredAccount = { ...account, identifier: normalizeIdentifier(account.identifier) };
  const all = listAccounts().filter((a) => a.identifier !== next.identifier);
  all.push(next);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
  return next;
}

export function findAccount(identifier: string): StoredAccount | undefined {
  const id = normalizeIdentifier(identifier);
  return listAccounts().find((a) => a.identifier === id || normalizeIdentifier(a.phone ?? "") === id || (a.email ?? "").toLowerCase() === id);
}
