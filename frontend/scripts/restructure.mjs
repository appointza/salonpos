/**
 * Reorganize src into pages/, layouts/, utils/, services/, hooks/, context/, types/
 * Extract page components from route files into pages/{Name}/{Name}.tsx
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const src = path.join(repoRoot, "frontend/src");
const routesDir = path.join(src, "routes");

function pascalCase(name) {
  return name
    .split(/[-./$]/)
    .filter(Boolean)
    .map((s) => (s.startsWith("$") ? s.slice(1) : s))
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function pageFolderForRoute(rel) {
  const r = rel.replace(/\\/g, "/");
  if (r === "index.tsx") return "Home";
  if (r === "login.tsx") return "Login";
  if (r === "register.tsx") return "Register";
  if (r === "book.tsx") return "Book";
  if (r === "nearby.tsx") return "Nearby";
  if (r === "platform.tsx") return "Platform";
  if (r === "walk-in.tsx") return "WalkIn";
  if (r === "$orgSlug.tsx") return "OrgSlug";
  if (r === "qr.$locationId.tsx" || r === "qr/$locationId.tsx") return "QrLocation";
  if (r === "nearby.my-shops.tsx" || r === "nearby/my-shops.tsx") return "NearbyMyShops";
  if (r === "$orgSlug.walk-in.tsx" || r === "$orgSlug/walk-in.tsx") return "OrgWalkIn";

  if (r.startsWith("_app/")) {
    const rest = r.slice("_app/".length).replace(/\.tsx$/, "");
    if (rest === "customers/$customerId") return "CustomerDetail";
    if (rest === "coupons/$couponId") return "CouponDetail";
    if (rest === "coupons/$couponId.codes") return "CouponCodes";
    if (rest.startsWith("loyalty/")) {
      const child = rest.slice("loyalty/".length);
      if (child === "index") return "LoyaltyIndex";
      return `Loyalty${pascalCase(child)}`;
    }
    const base = rest.split("/").pop() ?? rest;
    return pascalCase(base);
  }
  return pascalCase(r.replace(/\.tsx$/, ""));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith(".tsx") && !["__root.tsx", "_app.tsx"].includes(e.name)) acc.push(full);
  }
  return acc;
}

function stripCreateFileRouteImport(source) {
  return source
    .replace(/^import\s*\{\s*createFileRoute\s*,\s*/m, "import { ")
    .replace(/^import\s*\{\s*createFileRoute\s*\}\s*from\s*"@tanstack\/react-router";\s*\n?/m, "")
    .replace(/,\s*createFileRoute\s*/g, ", ")
    .replace(/createFileRoute\s*,\s*/g, "");
}

function extractRouteBlock(source) {
  const start = source.indexOf("export const Route = createFileRoute");
  if (start === -1) return null;
  let i = source.indexOf("({", start);
  let depth = 0;
  let end = -1;
  for (let j = i; j < source.length; j++) {
    const ch = source[j];
    if (ch === "(" || ch === "{" || ch === "[") depth++;
    if (ch === ")" || ch === "}" || ch === "]") depth--;
    if (depth === 0 && ch === ")") {
      end = j + 1;
      if (source[end] === ";") end++;
      break;
    }
  }
  if (end === -1) return null;
  const block = source.slice(start, end);
  const componentMatch = block.match(/component:\s*([A-Za-z0-9_]+)/);
  return { block, component: componentMatch?.[1] ?? null, start, end };
}

function exportNamedComponent(source, name) {
  if (!name) return source;
  if (source.includes(`export function ${name}`) || source.includes(`export const ${name}`)) return source;
  const fn = new RegExp(`function\\s+${name}\\s*\\(`);
  if (fn.test(source)) return source.replace(fn, `export function ${name}(`);
  const c = new RegExp(`const\\s+${name}\\s*=`);
  if (c.test(source)) return source.replace(c, `export const ${name} =`);
  return source;
}

const extracted = [];

for (const file of walk(routesDir)) {
  const rel = path.relative(routesDir, file);
  const source = fs.readFileSync(file, "utf8");
  const info = extractRouteBlock(source);
  if (!info?.component) continue;

  const before = source.slice(0, info.start).trimEnd();
  const after = source.slice(info.end).trim();
  const pageBody = stripCreateFileRouteImport(`${before}\n\n${after}`.trim());
  const folder = pageFolderForRoute(rel);
  const pageDir = path.join(src, "pages", folder);
  const pageFile = path.join(pageDir, `${folder}.tsx`);
  const pageSource = exportNamedComponent(pageBody, info.component);

  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(pageFile, `${pageSource}\n`);

  const headLines = before
    .split("\n")
    .filter((l) => /^const (title|description) =/.test(l.trim()))
    .join("\n");

  const importPath = `@/pages/${folder}/${folder}`;
  const routeSource = `import { createFileRoute } from "@tanstack/react-router";
import { ${info.component} } from "${importPath}";
${headLines ? `\n${headLines}\n` : "\n"}
${info.block}
`;
  fs.writeFileSync(file, routeSource);
  extracted.push({ rel, folder, component: info.component });
  console.log(`page: ${folder}/${folder}.tsx <- ${rel}`);
}

console.log(`extracted ${extracted.length} pages`);
