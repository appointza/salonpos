import type { CouponPoolCode } from "@/lib/coupons/coupon-code-pool";
import type { CouponRule } from "@/lib/coupons/coupon-schema";

function escapeCsv(value: string) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCouponCodesExcel(
  codes: CouponPoolCode[],
  coupon: CouponRule,
  orgName: string,
  filter?: "all" | "available" | "used",
) {
  const rows =
    filter === "available"
      ? codes.filter((c) => c.status === "Available")
      : filter === "used"
        ? codes.filter((c) => c.status === "Used")
        : codes;

  const headers = [
    "S.No",
    "Coupon Code",
    "Scheme Name",
    "Offer",
    "Status",
    "Customer",
    "Mobile",
    "Issued Date",
    "Used Date",
    "Bill Number",
    "Discount Amount",
    "Location",
    "Organisation",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row, i) =>
      [
        row.poolIndex || i + 1,
        row.code,
        coupon.title,
        coupon.description || coupon.title,
        row.status,
        row.customerName,
        row.customerPhone,
        row.issuedAt,
        row.redeemedAt,
        row.invoiceId,
        row.discountAmount,
        row.locationName,
        orgName,
      ]
        .map((cell) => escapeCsv(String(cell)))
        .join(","),
    ),
  ];

  const safeName = (coupon.codePrefix || coupon.code).replace(/[^A-Za-z0-9_-]+/g, "_") || "coupon";
  const suffix = filter && filter !== "all" ? `-${filter}` : "";
  downloadBlob(`${safeName}-codes${suffix}.csv`, `\uFEFF${lines.join("\r\n")}`, "text/csv;charset=utf-8;");
}

export function printCouponCodes(codes: CouponPoolCode[], coupon: CouponRule, orgName: string) {
  const available = codes.filter((c) => c.status === "Available");
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${coupon.title} — Coupon codes</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    p { margin: 0 0 16px; color: #555; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #f3f4f6; }
    .code { font-family: ui-monospace, monospace; font-weight: 700; font-size: 13px; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>${orgName} — ${coupon.title}</h1>
  <p>${coupon.description || coupon.title} · ${available.length} codes · Print and distribute</p>
  <table>
    <thead>
      <tr><th>#</th><th>Coupon code</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${available
        .map(
          (row) =>
            `<tr><td>${row.poolIndex || ""}</td><td class="code">${row.code}</td><td>${row.status}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}
