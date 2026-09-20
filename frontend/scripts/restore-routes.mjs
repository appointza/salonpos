import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
const routesDir = path.join(repoRoot, "frontend/src/routes");

const PUBLIC = new Set([
  "index.tsx",
  "login.tsx",
  "register.tsx",
  "book.tsx",
  "nearby.tsx",
  "platform.tsx",
  "$orgSlug.tsx",
  "qr.$locationId.tsx",
  "walk-in.tsx",
]);

function gitShow(rel) {
  try {
    return execSync(`git show HEAD:frontend/src/routes/${rel}`, { cwd: repoRoot, encoding: "utf8" });
  } catch {
    return null;
  }
}

function destPath(rel) {
  if (PUBLIC.has(rel)) return rel;
  if (rel === "customers.$customerId.tsx") return "_app/customers/$customerId.tsx";
  if (rel.startsWith("loyalty/")) return `_app/${rel}`;
  return `_app/${rel}`;
}

function patchAppRoute(source, rel) {
  if (PUBLIC.has(rel)) return source;
  const routePath = rel
    .replace(/\.tsx$/, "")
    .replace("customers.$customerId", "customers/$customerId")
    .replace("qr.$locationId", "qr/$locationId");
  return source.replace(/createFileRoute\("\/[^"]+"\)/, `createFileRoute("/_app/${routePath}")`);
}

function write(rel, content) {
  const out = path.join(routesDir, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

const gitFiles = execSync("git ls-tree -r HEAD --name-only frontend/src/routes", { cwd: repoRoot, encoding: "utf8" })
  .trim()
  .split("\n")
  .map((f) => f.replace("frontend/src/routes/", ""))
  .filter((f) => f.endsWith(".tsx") && f !== "__root.tsx" && f !== "README.md");

for (const gitPath of gitFiles) {
  const raw = gitShow(gitPath);
  if (!raw) continue;
  const dest = destPath(gitPath);
  write(dest, patchAppRoute(raw, gitPath));
  console.log(`${gitPath} -> ${dest}`);
}

// Layout shell (router-outlet) — not in old git tree
write(
  "_app.tsx",
  `import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { getStoredSession } from "@/lib/auth";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    const user = getStoredSession();
    if (!user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
`,
);

// Remove stale dot-notation duplicates only (keep _app.tsx)
for (const file of fs.readdirSync(routesDir)) {
  if (/^_app\.[^/]+\.tsx$/.test(file)) {
    fs.unlinkSync(path.join(routesDir, file));
    console.log("removed duplicate", file);
  }
}

if (fs.existsSync(path.join(repoRoot, "frontend/src/pages"))) {
  fs.rmSync(path.join(repoRoot, "frontend/src/pages"), { recursive: true, force: true });
  console.log("removed src/pages");
}

console.log("done");
