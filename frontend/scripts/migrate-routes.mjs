import fs from "node:fs";
import path from "node:path";

const routesDir = path.resolve("src/routes");

function destForFlatName(baseName) {
  // baseName like "_app.dashboard" or "_app.loyalty.overview"
  if (!baseName.startsWith("_app.")) return null;
  const rest = baseName.slice("_app.".length);

  const loyalty = rest.match(/^loyalty\.(.+)$/);
  if (loyalty) {
    const child = loyalty[1];
    return child === "index" ? "_app/loyalty/index.tsx" : `_app/loyalty/${child}.tsx`;
  }

  const customer = rest.match(/^customers\.(\$customerId)$/);
  if (customer) return `_app/customers/$customerId.tsx`;

  const couponCodes = rest.match(/^coupons\.(\$couponId)\.(.+)$/);
  if (couponCodes) return `_app/coupons/$couponId.${couponCodes[2]}.tsx`;

  const coupon = rest.match(/^coupons\.(\$couponId)$/);
  if (coupon) return `_app/coupons/$couponId.tsx`;

  return `_app/${rest}.tsx`;
}

const otherMoves = [
  ["nearby.my-shops.tsx", "nearby/my-shops.tsx"],
  ["$orgSlug.walk-in.tsx", "$orgSlug/walk-in.tsx"],
  ["qr.$locationId.tsx", "qr/$locationId.tsx"],
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function moveFile(fromRel, toRel) {
  const from = path.join(routesDir, fromRel);
  const to = path.join(routesDir, toRel);
  if (!fs.existsSync(from)) {
    console.warn("skip missing", fromRel);
    return;
  }
  ensureDir(to);
  fs.renameSync(from, to);
  console.log(`${fromRel} -> ${toRel}`);
}

for (const file of fs.readdirSync(routesDir)) {
  if (!file.startsWith("_app.") || !file.endsWith(".tsx")) continue;
  const dest = destForFlatName(file.replace(/\.tsx$/, ""));
  if (!dest) continue;
  moveFile(file, dest);
}

for (const [from, to] of otherMoves) {
  moveFile(from, to);
}

console.log("done");
