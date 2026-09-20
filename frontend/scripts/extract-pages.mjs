import fs from "node:fs";
import path from "node:path";

const routesRoot = path.resolve("src/routes");
const pagesRoot = path.resolve("src/pages");

function pascalCase(segment) {
  return segment
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function pageNameForRoute(rel) {
  const normalized = rel.replace(/\\/g, "/");
  if (normalized.startsWith("_app/")) {
    const rest = normalized.slice("_app/".length).replace(/\.tsx$/, "");
    if (rest === "customers/$customerId") return "CustomerDetail";
    if (rest === "coupons/$couponId") return "CouponDetail";
    if (rest === "coupons/$couponId.codes") return "CouponCodes";
    if (rest.startsWith("loyalty/")) {
      const child = rest.slice("loyalty/".length);
      if (child === "index") return "loyalty/LoyaltyIndex";
      return `loyalty/${pascalCase(child)}`;
    }
    const base = rest.split("/").pop() ?? rest;
    return pascalCase(base);
  }
  if (normalized === "login.tsx") return "Login";
  if (normalized === "register.tsx") return "Register";
  if (normalized === "index.tsx") return "Home";
  if (normalized === "platform.tsx") return "Platform";
  if (normalized === "walk-in.tsx") return "WalkIn";
  if (normalized === "book.tsx") return "Book";
  if (normalized === "nearby.tsx") return "Nearby";
  if (normalized === "nearby/my-shops.tsx") return "NearbyMyShops";
  if (normalized === "$orgSlug.tsx") return "OrgSlug";
  if (normalized === "$orgSlug/walk-in.tsx") return "OrgWalkIn";
  if (normalized === "qr/$locationId.tsx") return "QrLocation";
  return pascalCase(normalized.replace(/\.tsx$/, "").replace(/\//g, "-"));
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".tsx") && entry.name !== "__root.tsx" && entry.name !== "_app.tsx") acc.push(full);
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
  if (i === -1) return null;
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

function exportComponent(source, componentName) {
  if (!componentName) return source;
  const fn = new RegExp(`function\\s+${componentName}\\s*\\(`);
  if (fn.test(source)) return source.replace(fn, `export function ${componentName}(`);
  const constFn = new RegExp(`const\\s+${componentName}\\s*=`);
  if (constFn.test(source)) return source.replace(constFn, `export const ${componentName} =`);
  return `${source}\nexport { ${componentName} };\n`;
}

function processRouteFile(filePath) {
  const rel = path.relative(routesRoot, filePath);
  const source = fs.readFileSync(filePath, "utf8");
  const extracted = extractRouteBlock(source);
  if (!extracted?.component) {
    console.warn("skip (no component)", rel);
    return;
  }

  const before = source.slice(0, extracted.start).trimEnd();
  const after = source.slice(extracted.end).trim();
  const pageBody = stripCreateFileRouteImport(`${before}\n\n${after}`.trim());
  const pageName = pageNameForRoute(rel);
  const pagePath = path.join(pagesRoot, `${pageName}.tsx`);
  const pageSource = exportComponent(pageBody, extracted.component);

  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(pagePath, `${pageSource}\n`);

  const importPath = `@/pages/${pageName.replace(/\\/g, "/")}`;
  const headConsts = before
    .split("\n")
    .filter((line) => /^const (title|description) =/.test(line.trim()))
    .join("\n");

  const routeSource = `import { createFileRoute } from "@tanstack/react-router";
import { ${extracted.component} } from "${importPath}";
${headConsts ? `\n${headConsts}\n` : "\n"}
${extracted.block}
`;
  fs.writeFileSync(filePath, routeSource);
  console.log(`${rel} -> pages/${pageName}.tsx`);
}

for (const file of walk(routesRoot)) {
  processRouteFile(file);
}

console.log("done");
