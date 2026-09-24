import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "lib" || e.name === "node_modules") continue;
      walk(p, acc);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const skip = new Set([
  path.join(root, "hooks", "useAuth.ts"),
  path.join(root, "context", "AuthContext.tsx"),
]);

const replacements = [
  [/import \{ useAuth \} from ["']@\/lib\/auth["'];/g, 'import { useAuth } from "@/hooks/useAuth";'],
  [/import \{ useAuth, type Role \} from ["']@\/lib\/auth["'];/g, 'import { useAuth, type Role } from "@/hooks/useAuth";'],
  [/import \{ AuthProvider \} from ["']@\/lib\/auth["'];/g, 'import { AuthProvider } from "@/context/AuthContext";'],
  [/import \{ getStoredSession \} from ["']@\/lib\/auth["'];/g, 'import { getStoredSession } from "@/context/AuthContext";'],
];

let changed = 0;
for (const f of walk(root)) {
  if (skip.has(f)) continue;
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("@/lib/auth")) continue;
  const orig = s;
  for (const [re, to] of replacements) s = s.replace(re, to);
  if (s !== orig) {
    fs.writeFileSync(f, s);
    changed++;
    console.log("updated", path.relative(root, f));
  }
}
console.log("changed", changed);
