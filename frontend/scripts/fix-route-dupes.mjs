import fs from "node:fs";
import path from "node:path";

const routesRoot = path.join(process.cwd(), "src/routes");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

function dedupe(source) {
  let seenTitle = false;
  let seenDescription = false;
  const lines = source.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^const title =/.test(line)) {
      if (seenTitle) {
        while (i < lines.length && !lines[i].trimEnd().endsWith(";")) i++;
        continue;
      }
      seenTitle = true;
    }
    if (/^const description =/.test(line)) {
      if (seenDescription) {
        while (i < lines.length && !lines[i].trimEnd().endsWith(";")) i++;
        continue;
      }
      seenDescription = true;
    }
    out.push(line);
  }

  return out.join("\n");
}

let fixed = 0;
for (const file of walk(routesRoot)) {
  const before = fs.readFileSync(file, "utf8");
  const after = dedupe(before);
  if (after !== before) {
    fs.writeFileSync(file, after);
    fixed++;
  }
}

console.log(`fixed ${fixed} files`);
