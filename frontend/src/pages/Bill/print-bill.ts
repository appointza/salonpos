import { salonLogoUrl } from "@/brand";
import {
  clampLogoSize,
  gstInclusive,
  invoiceDisplayId,
  money2,
  type BillPreviewLine,
  type BillSettings,
} from "@/pages/Settings/bill-settings";
import type { Row } from "@/store";

export type PrintBillInput = {
  settings: BillSettings;
  salonName: string;
  logo?: string | null;
  billNo: string;
  date: string;
  lines: BillPreviewLine[];
  payment?: string;
  cashReceived?: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatBillDate(raw?: string) {
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;
  }
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export function linesFromInvoice(row: Row, defaultGst = 18): BillPreviewLine[] {
  const gstRate = Number(row["gstRate"] ?? defaultGst) || defaultGst;
  const total = Number(row["total"] ?? 0);
  const raw = String(row["items"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!raw.length) return [{ name: "Sale", qty: 1, gstRate, amount: total }];
  const parsed = raw.map((part) => {
    const match = part.match(/^(.*)\s+x(\d+)$/i);
    const qty = match ? Math.max(1, Number(match[2])) : 1;
    return { name: (match ? match[1] : part).trim() || "Item", qty, gstRate };
  });
  const units = parsed.reduce((s, l) => s + l.qty, 0) || parsed.length;
  return parsed.map((l) => ({
    ...l,
    amount: total * (l.qty / units),
  }));
}

function htmlIf(condition: unknown, html: string) {
  return condition ? html : "";
}

function receiptHeaderHtml(input: PrintBillInput, name: string, cityLine: string, logo: string) {
  const address = htmlIf(input.settings.address, `<div class="addr">${escapeHtml(input.settings.address)}</div>`);
  const landmark = htmlIf(input.settings.landmark, `<div>${escapeHtml(input.settings.landmark)}</div>`);
  const phone = htmlIf(input.settings.phone, `<div class="phone">Ph: ${escapeHtml(input.settings.phone)}</div>`);
  const tagline = htmlIf(input.settings.tagline, `<div class="tag">${escapeHtml(input.settings.tagline)}</div>`);
  const smallName = htmlIf(name, `<div class="name small">${escapeHtml(name)}</div>`);
  const largeName = htmlIf(name, `<div class="name">${escapeHtml(name)}</div>`);
  const gstBits = [
    input.settings.gstin ? "GSTIN:" + escapeHtml(input.settings.gstin) : "",
    cityLine ? escapeHtml(cityLine.toUpperCase()) : "",
  ]
    .filter(Boolean)
    .join(" ");
  const gstLine = gstBits
    ? `<div style="margin-top:4px;font-size:11px;font-weight:600;">${gstBits}</div>`
    : "";
  const body = input.settings.compactHeader
    ? `${address}${landmark}${phone}${smallName}${tagline}`
    : `${largeName}${tagline}${address}${landmark}${phone}`;
  return `${htmlIf(logo, `<img src="${escapeHtml(logo)}" alt="" />`)}${body}${gstLine}`;
}

function receiptHtml(input: PrintBillInput) {
  const items = input.lines.length ? input.lines : [{ name: "Sale", qty: 1, gstRate: input.settings.defaultGstRate, amount: 0 }];
  const total = items.reduce((s, l) => s + l.amount, 0);
  const qty = items.reduce((s, l) => s + l.qty, 0);
  const paid = input.cashReceived ?? total;
  const balance = Math.max(0, total - paid);
  const gstRate = items[0]?.gstRate ?? input.settings.defaultGstRate;
  const gst = gstInclusive(total, gstRate);
  const name = String(input.settings.legalName ?? "").trim();
  const cityLine = [input.settings.city, input.settings.pincode].filter(Boolean).join("-");
  const logo = input.settings.showLogo ? salonLogoUrl(input.logo) : "";
  const logoPx = clampLogoSize(input.settings.logoSize);
  const payment = input.payment || "Cash";

  const lineRows = items
    .map((line) => {
      const row = gstInclusive(line.amount, line.gstRate);
      return `<tr>
        <td>${escapeHtml(line.name.toUpperCase())}</td>
        <td class="r">${money2(row.taxable / Math.max(1, line.qty))}</td>
        <td class="r">${line.qty}</td>
        <td class="r">${line.gstRate}</td>
        <td class="r">${money2(line.amount)}</td>
      </tr>`;
    })
    .join("");

  const headerHtml = receiptHeaderHtml(input, name, cityLine, logo);

  const gstTable = input.settings.showGstSplit
    ? `<table>
        <thead>
          <tr><th>GST%</th><th class="r">Amount</th><th class="r">CGST%</th><th class="r">CGST</th><th class="r">SGST%</th><th class="r">SGST</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${gstRate}%</td>
            <td class="r">${money2(gst.taxable)}</td>
            <td class="r">${gst.cgstRate}</td>
            <td class="r">${money2(gst.cgst)}</td>
            <td class="r">${gst.sgstRate}</td>
            <td class="r">${money2(gst.sgst)}</td>
          </tr>
        </tbody>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Bill ${escapeHtml(input.billNo)}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { font-family: Arial, Helvetica, sans-serif; width: 72mm; margin: 0 auto; font-size: 12px; }
    img { display: block; margin: 0 auto 4px; height: ${logoPx}px; width: ${logoPx}px; max-width: 100%; object-fit: contain; }
    .c { text-align: center; }
    .name { font-size: 18px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
    .name.small { font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 0.06em; }
    .tag { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px; }
    .addr { font-size: 11px; font-weight: 700; margin-top: 4px; }
    .phone { font-size: 11px; }
    .meta { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin-top: 8px; font-weight: 700; display: flex; justify-content: space-between; gap: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
    th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; }
    td { padding: 3px 0; vertical-align: top; }
    .r { text-align: right; white-space: nowrap; }
    .total { border-top: 1px solid #000; border-bottom: 1px solid #000; text-align: right; font-weight: 800; padding: 4px 0; margin-top: 6px; }
    .pay { text-align: center; font-weight: 700; margin-top: 8px; }
    .foot { text-align: center; margin-top: 14px; font-size: 11px; }
    .soft { margin-top: 10px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="c">
    ${headerHtml}
  </div>
  <div class="meta">
    <span>Bill No: ${escapeHtml(input.billNo)}</span>
    <span>Date:${escapeHtml(input.date)}</span>
  </div>
  <table>
    <thead>
      <tr><th>PARTICULARS</th><th class="r">RATE</th><th class="r">QTY</th><th class="r">GST</th><th class="r">AMT</th></tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  <div class="total">Total&nbsp;&nbsp;${money2(total)}</div>
  <div class="pay">${escapeHtml(payment)} Received : ${money2(paid)} &nbsp; Balance : ${money2(balance)}</div>
  <div>Tot Qty: ${qty}</div>
  ${gstTable}
  ${input.settings.footer ? `<div class="foot">${escapeHtml(input.settings.footer)}</div>` : ""}
  ${input.settings.softwareBy ? `<div class="soft">${escapeHtml(input.settings.softwareBy)}</div>` : ""}
</body>
</html>`;
}

export function printSalonBill(input: PrintBillInput): boolean {
  document.querySelectorAll("iframe[data-krios-print]").forEach((el) => el.remove());
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-krios-print", "1");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);
  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    return false;
  }
  win.document.open();
  win.document.write(receiptHtml(input));
  win.document.close();

  let printed = false;
  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1500);
  };
  const runPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } catch {
      printed = false;
    } finally {
      cleanup();
    }
  };

  const images = Array.from(win.document.images);
  if (!images.length) {
    window.setTimeout(runPrint, 50);
    return true;
  }
  let pending = images.length;
  const done = () => {
    pending -= 1;
    if (pending <= 0) runPrint();
  };
  for (const img of images) {
    if (img.complete) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }
  window.setTimeout(runPrint, 1500);
  return true;
}

export function printInvoiceRow(row: Row, settings: BillSettings, salonName: string, logo?: string | null): boolean {
  return printSalonBill({
    settings,
    salonName,
    logo,
    billNo: invoiceDisplayId(row.id, settings.invoicePrefix),
    date: formatBillDate(String(row["date"] ?? "")),
    lines: linesFromInvoice(row, settings.defaultGstRate),
    payment: String(row["payment"] || "Cash"),
    cashReceived: Number(row["total"] ?? 0),
  });
}
