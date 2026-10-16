import { environment } from "@/utils/environment.util";

export const BRAND_NAME = "Krios";
export const BRAND_LOGO = "/krios-logo.png";
export const BRAND_DESCRIPTION = "Salon & business growth platform.";
export const DEFAULT_ORG_SLUG = "krios-salon-group";
export const DEFAULT_APP_ORIGIN = "https://kriosapp.com";

function isAssetId(value: string) {
  return /^\d+$/.test(value) && Number(value) > 0;
}

/** Image src for an uploaded asset id only — empty when none. */
export function assetImageUrl(id?: string | number | null) {
  const value = String(id ?? "").trim();
  if (!isAssetId(value)) return "";
  const base = String(environment.baseurl ?? "").replace(/\/$/, "");
  return `${base}/api/Asset/File/${value}`;
}

/** Image src from an uploaded asset id, a data URL, or an http URL. */
export function salonLogoUrl(logo?: string | null) {
  const value = String(logo ?? "").trim();
  if (!value) return BRAND_LOGO;
  if (value.startsWith("data:") || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) {
    return value;
  }
  return assetImageUrl(value) || BRAND_LOGO;
}

export function pageTitle(section: string) {
  return `${section} — ${BRAND_NAME}`;
}
