import { useCallback, useMemo } from "react";
import type { EntityId } from "@/ids";
import type { Db, Row } from "@/store";
import { useData } from "@/store";
import { useTenant } from "@/tenant";

export const GST_RATES = ["0", "5", "12", "18", "28"] as const;

export type BillSettings = {
  legalName: string;
  tagline: string;
  gstin: string;
  pan: string;
  address: string;
  landmark: string;
  city: string;
  pincode: string;
  phone: string;
  email: string;
  invoicePrefix: string;
  defaultGstRate: number;
  footer: string;
  softwareBy: string;
  showLogo: boolean;
  logoSize: number;
  compactHeader: boolean;
  showGstSplit: boolean;
};

export const LOGO_SIZE_MIN = 28;
export const LOGO_SIZE_MAX = 140;
export const LOGO_SIZE_DEFAULT = 56;
export const LOGO_SIZE_OPTIONS = [
  { id: "small", label: "Small", px: 40 },
  { id: "medium", label: "Medium", px: 56 },
  { id: "large", label: "Large", px: 88 },
  { id: "xlarge", label: "Extra large", px: 120 },
] as const;

export function clampLogoSize(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return LOGO_SIZE_DEFAULT;
  return Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, Math.round(n)));
}

export type BillPreviewLine = {
  name: string;
  qty: number;
  gstRate: number;
  amount: number;
};

export function gstInclusive(amount: number, gstRate: number) {
  const rate = Number(gstRate) || 0;
  const total = Math.max(0, Number(amount) || 0);
  const taxable = rate <= 0 ? total : total / (1 + rate / 100);
  const tax = total - taxable;
  const halfRate = rate / 2;
  const halfTax = tax / 2;
  return {
    taxable,
    tax,
    cgstRate: halfRate,
    sgstRate: halfRate,
    cgst: halfTax,
    sgst: halfTax,
  };
}

export function money2(n: number) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STORAGE_KEY = "krios-bill-settings";

export function defaultBillSettings(): BillSettings {
  return {
    legalName: "",
    tagline: "",
    gstin: "",
    pan: "",
    address: "",
    landmark: "",
    city: "",
    pincode: "",
    phone: "",
    email: "",
    invoicePrefix: "INV",
    defaultGstRate: 18,
    footer: "Thanks ! *** Have A Nice Day *** Visit again !",
    softwareBy: "",
    showLogo: true,
    logoSize: LOGO_SIZE_DEFAULT,
    compactHeader: true,
    showGstSplit: true,
  };
}

function readAllStored(): Record<string, BillSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BillSettings>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStored(orgId: EntityId, settings: BillSettings) {
  if (typeof window === "undefined") return;
  try {
    const all = readAllStored();
    all[String(orgId)] = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function billSettingsJson(raw: unknown): Partial<BillSettings> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object") return raw as Partial<BillSettings>;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Partial<BillSettings>) : null;
  } catch {
    return null;
  }
}

export function normalizeInvoicePrefix(raw: string | undefined): string {
  const cleaned = String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  return cleaned || "INV";
}

export function invoiceDisplayId(id: string | number | undefined, prefix = "INV"): string {
  const raw = String(id ?? "").trim();
  const p = normalizeInvoicePrefix(prefix);
  if (!raw) return `${p}-`;
  if (raw.toUpperCase().startsWith(`${p}-`) || raw.toUpperCase().startsWith(p)) return raw;
  return `${p}-${raw}`;
}

export function itemGstRate(item: Row | undefined | null, fallback = 18): number {
  if (!item) return fallback;
  const raw = item["gstRate"];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeBillSettings(next: Partial<BillSettings> | null | undefined): BillSettings {
  const base = defaultBillSettings();
  const gst = Number(next?.defaultGstRate);
  const allowed = GST_RATES.map(Number);
  return {
    legalName: String(next?.legalName ?? "").trim(),
    tagline: String(next?.tagline ?? "").trim(),
    gstin: String(next?.gstin ?? "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 15),
    pan: String(next?.pan ?? "")
      .toUpperCase()
      .replace(/\s+/g, "")
      .slice(0, 10),
    address: String(next?.address ?? "").trim(),
    landmark: String(next?.landmark ?? "").trim(),
    city: String(next?.city ?? "").trim(),
    pincode: String(next?.pincode ?? "").trim(),
    phone: String(next?.phone ?? "").trim(),
    email: String(next?.email ?? "").trim(),
    invoicePrefix: normalizeInvoicePrefix(next?.invoicePrefix),
    defaultGstRate: allowed.includes(gst) ? gst : base.defaultGstRate,
    footer: next?.footer == null ? base.footer : String(next.footer).trim(),
    softwareBy: String(next?.softwareBy ?? "").trim(),
    showLogo: next?.showLogo !== false,
    logoSize: clampLogoSize(next?.logoSize ?? base.logoSize),
    compactHeader: next?.compactHeader !== false,
    showGstSplit: next?.showGstSplit !== false,
  };
}

export function parseBillSettings(raw: unknown): BillSettings | null {
  const data = billSettingsJson(raw);
  if (!data) return null;
  return normalizeBillSettings(data);
}

export function readBillSettings(orgRow: Row | undefined | null, orgId?: EntityId): BillSettings {
  const fromRow = parseBillSettings(orgRow?.["billSettings"]);
  const id = String(orgId ?? orgRow?.["orgId"] ?? "");
  const stored = id ? readAllStored()[id] : undefined;
  return normalizeBillSettings(stored ?? fromRow ?? defaultBillSettings());
}

export function hydrateBillSettings(db: Db): Db {
  const stored = readAllStored();
  if (!Object.keys(stored).length) return db;
  const organizations = (db.organizations ?? []).map((row) => {
    const saved = stored[String(row.orgId)];
    if (!saved) return row;
    return { ...row, billSettings: JSON.stringify(saved) };
  });
  return { ...db, organizations };
}

export function useBillSettings() {
  const { orgId } = useTenant();
  const { allRows, applyCache, update } = useData();
  const orgRow = useMemo(
    () => (allRows["organizations"] ?? []).find((r) => String(r["orgId"]) === String(orgId)),
    [allRows, orgId],
  );
  const settings = useMemo(() => readBillSettings(orgRow, orgId), [orgRow, orgId]);

  const save = useCallback(
    (next: BillSettings) => {
      const cleaned = normalizeBillSettings(next);
      writeStored(orgId, cleaned);
      applyCache((prev) => ({
        ...prev,
        organizations: (prev["organizations"] ?? []).map((row) =>
          String(row["orgId"]) === String(orgId) ? { ...row, billSettings: JSON.stringify(cleaned) } : row,
        ),
      }));
      if (orgRow) {
        void update("organizations", String(orgRow.id), {
          ...orgRow,
          billSettings: JSON.stringify(cleaned),
        });
      }
    },
    [applyCache, orgId, orgRow, update],
  );

  return { settings, save, orgRow };
}
