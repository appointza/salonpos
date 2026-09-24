import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const reps = [
  [/orgId: string/g, "orgId: EntityId"],
  [/locationId: string/g, "locationId: EntityId"],
  [/locationId\?: string/g, "locationId?: EntityId"],
  [/orgId\?: string/g, "orgId?: EntityId"],
  [/invoiceId: string/g, "invoiceId: EntityId"],
  [/customerId: string/g, "customerId: EntityId"],
  [/staffId: string/g, "staffId: EntityId"],
  [/appointmentId: string/g, "appointmentId: EntityId"],
  [/couponId: string/g, "couponId: EntityId"],
];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

let count = 0;
for (const file of walk(root)) {
  let s = readFileSync(file, "utf8");
  const orig = s;
  for (const [a, b] of reps) s = s.replace(a, b);
  if (s === orig) continue;
  if (s.includes("EntityId") && !s.includes('from "@/lib/ids"')) {
    s = `import type { EntityId } from "@/lib/ids";\n${s}`;
  }
  writeFileSync(file, s);
  count++;
}
console.log(`Updated ${count} files`);
