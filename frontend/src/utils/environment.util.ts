import { Capacitor } from "@capacitor/core";

/** Android / iOS always talk to production. */
export const KRIOS_API_URL = "https://kriosapp.com";

function readRuntimeApiUrl() {
  if (typeof window === "undefined") return "";
  const fromWindow = String(window.__KRIOS_API_URL__ ?? "").trim();
  if (fromWindow) return fromWindow.replace(/\/$/, "");
  return "";
}

function isLoopback(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function apiBaseUrl() {
  if (Capacitor.isNativePlatform()) return KRIOS_API_URL;

  const fromEnv = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (import.meta.env.DEV) return fromEnv;

  const configured = readRuntimeApiUrl() || fromEnv;
  if (configured && !isLoopback(configured)) return configured;

  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return KRIOS_API_URL;
}

/** Production: krios-urls.json → frontendApiBaseUrl, else current page host. Dev: Vite /api proxy. */
export const environment = {
  get baseurl() {
    return apiBaseUrl();
  },
  appname: "Krios Salon",
};

declare global {
  interface Window {
    __KRIOS_API_URL__?: string;
  }
}
