import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

const patterns = [
  [/String\(r\["orgId"\]\) !== orgId/g, 'String(r["orgId"]) !== String(orgId)'],
  [/String\(r\["orgId"\]\) === orgId/g, 'String(r["orgId"]) === String(orgId)'],
  [/String\(r\["locationId"\]\) === locationId/g, 'String(r["locationId"]) === String(locationId)'],
  [/String\(s\["orgId"\]\) === orgId/g, 'String(s["orgId"]) === String(orgId)'],
  [/String\(r\["orgId"\]\) === activeOrgId/g, 'String(r["orgId"]) === String(activeOrgId)'],
  [/String\(a\["orgId"\]\) === activeOrgId/g, 'String(a["orgId"]) === String(activeOrgId)'],
  [/String\(c\["orgId"\]\) === activeOrgId/g, 'String(c["orgId"]) === String(activeOrgId)'],
  [/String\(p\["orgId"\]\) === activeOrgId/g, 'String(p["orgId"]) === String(activeOrgId)'],
  [/String\(o\["orgId"\]\) === activeOrgId/g, 'String(o["orgId"]) === String(activeOrgId)'],
  [/String\(s\["orgId"\]\) === activeOrgId/g, 'String(s["orgId"]) === String(activeOrgId)'],
  [/t\.orgId === bookingOrgId/g, "String(t.orgId) === String(bookingOrgId)"],
  [/l\.locationId === initialLocationId/g, "String(l.locationId) === String(initialLocationId)"],
  [/l\.locationId === locationId/g, "String(l.locationId) === String(locationId)"],
  [/l\.locationId === v/g, "String(l.locationId) === String(v)"],
  [/location\.locationId === locationId/g, "String(location.locationId) === String(locationId)"],
  [/user\.orgId\)/g, "String(user.orgId))"], // might be wrong
];

let count = 0;
for (const file of walk(root)) {
  let s = readFileSync(file, "utf8");
  const orig = s;
  for (const [a, b] of patterns) s = s.replace(a, b);
  if (s !== orig) {
    writeFileSync(file, s);
    count++;
  }
}
console.log(`Patched ${count} files`);
