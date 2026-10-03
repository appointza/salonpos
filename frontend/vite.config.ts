/// <reference types="vitest/config" />
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const outDir = process.env.KRIOS_WWWROOT || "D:/aravindan/build/kriosbuild/wwwroot";
const urlsPath = path.resolve(outDir, "krios-urls.json");
let preservedUrls: string | undefined;
try {
  preservedUrls = fs.readFileSync(urlsPath, "utf8");
} catch {
  preservedUrls = undefined;
}

export default defineConfig({
  // Root-relative so nested public URLs like /salonone/walk-in still load JS.
  base: "/",
  plugins: [
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    {
      name: "preserve-krios-urls",
      closeBundle() {
        if (preservedUrls) fs.writeFileSync(urlsPath, preservedUrls);
      },
    },
  ],
  server: {
    port: Number(process.env.PORT) || 8080,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5050",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
