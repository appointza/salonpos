import JsBarcode from "jsbarcode";
import type { CouponPoolCode } from "@/lib/coupons/coupon-code-pool";
import type { CouponRule } from "@/lib/coupons/coupon-schema";

function barcodeSvgMarkup(code: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, code, {
    format: "CODE128",
    width: 2,
    height: 52,
    displayValue: true,
    fontSize: 13,
    fontOptions: "bold",
    margin: 6,
    background: "#ffffff",
    lineColor: "#111111",
  });
  return svg.outerHTML;
}

function barcodeSheetHtml(codes: CouponPoolCode[], coupon: CouponRule, orgName: string) {
  const labels = codes
    .map(
      (row) => `
      <div class="label">
        <p class="org">${orgName}</p>
        <p class="title">${coupon.title}</p>
        <div class="barcode">${barcodeSvgMarkup(row.code)}</div>
        <p class="code">${row.code}</p>
        <p class="status">${row.status}</p>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${coupon.title} — Barcodes</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .label {
      border: 1px dashed #bbb;
      border-radius: 8px;
      padding: 10px 8px 8px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .org { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #666; margin: 0; }
    .title { font-size: 11px; font-weight: 600; margin: 4px 0 6px; line-height: 1.3; }
    .barcode { display: flex; justify-content: center; }
    .barcode svg { max-width: 100%; height: auto; }
    .code { font-family: ui-monospace, monospace; font-size: 12px; font-weight: 700; margin: 6px 0 0; }
    .status { font-size: 9px; color: #666; margin: 2px 0 0; }
    @media print {
      body { padding: 8px; }
      .grid { gap: 8px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <h1>${coupon.title} — Coupon barcodes</h1>
    <p class="meta">${orgName} · ${codes.length} labels · Scan at POS or print and distribute</p>
  </div>
  <div class="grid">${labels}</div>
</body>
</html>`;
}

function openBarcodeWindow(html: string) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
  if (!win) return null;
  win.document.write(html);
  win.document.close();
  win.focus();
  return win;
}

export function printCouponBarcodes(codes: CouponPoolCode[], coupon: CouponRule, orgName: string) {
  if (!codes.length) return false;
  const win = openBarcodeWindow(barcodeSheetHtml(codes, coupon, orgName));
  if (!win) return false;
  win.onload = () => win.print();
  win.print();
  return true;
}

export function downloadCouponBarcodeSheet(codes: CouponPoolCode[], coupon: CouponRule, orgName: string) {
  if (!codes.length) return false;
  const html = barcodeSheetHtml(codes, coupon, orgName);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safe = (coupon.codePrefix || coupon.code || "coupon").replace(/[^A-Za-z0-9_-]+/g, "_");
  anchor.href = url;
  anchor.download = `${safe}-barcodes.html`;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}
