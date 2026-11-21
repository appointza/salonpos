import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

async function loadApiUrl() {
  try {
    const res = await fetch("./krios-urls.json", { cache: "no-store" });
    if (!res.ok) return;
    const urls = (await res.json()) as { frontendApiBaseUrl?: string };
    window.__KRIOS_API_URL__ = String(urls.frontendApiBaseUrl ?? "").trim();
  } catch {
    /* same-origin /api */
  }
}

void (async () => {
  void import("@/native")
    .then((m) => m.bootNativeShell())
    .catch(() => undefined);
  void loadApiUrl();
  const { App } = await import("@/App");
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
