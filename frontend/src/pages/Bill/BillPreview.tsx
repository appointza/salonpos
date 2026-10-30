import { salonLogoUrl } from "@/brand";
import {
  gstInclusive,
  money2,
  type BillPreviewLine,
  type BillSettings,
} from "@/pages/Settings/bill-settings";

type Props = {
  settings: BillSettings;
  salonName: string;
  logo?: string | null;
  billNo?: string;
  date?: string;
  lines?: BillPreviewLine[];
  cashReceived?: number;
  payment?: string;
};

function todayLabel() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export function sampleBillLines(gstRate: number): BillPreviewLine[] {
  return [{ name: "BEARD TRIM/SHAVE*", qty: 1, gstRate, amount: 100 }];
}

export function BillPreview({
  settings,
  logo,
  billNo = "51342",
  date = todayLabel(),
  lines,
  cashReceived,
  payment = "Cash",
}: Props) {
  const items = lines?.length ? lines : sampleBillLines(settings.defaultGstRate);
  const total = items.reduce((s, l) => s + l.amount, 0);
  const qty = items.reduce((s, l) => s + l.qty, 0);
  const paid = cashReceived ?? total;
  const balance = Math.max(0, total - paid);
  const gstRate = items[0]?.gstRate ?? settings.defaultGstRate;
  const gst = gstInclusive(total, gstRate);
  const name = settings.legalName.trim();
  const cityLine = [settings.city, settings.pincode].filter(Boolean).join("-");

  return (
    <div className="bill-preview mx-auto w-full max-w-[22rem] bg-white px-4 py-5 text-black shadow-sm print:max-w-none print:shadow-none">
      <div className="text-center">
        {settings.showLogo ? (
          <img
            src={salonLogoUrl(logo)}
            alt=""
            className="mx-auto mb-1 object-contain"
            style={{
              height: settings.logoSize,
              width: settings.logoSize,
              maxHeight: settings.logoSize,
              maxWidth: "100%",
            }}
          />
        ) : null}
        {settings.compactHeader ? (
          <>
            {settings.address ? <p className="mt-1 text-xs font-semibold">{settings.address}</p> : null}
            {settings.landmark ? <p className="text-xs">{settings.landmark}</p> : null}
            {settings.phone ? <p className="text-xs">Ph: {settings.phone}</p> : null}
            {name ? (
              <p className="mt-2 text-sm font-semibold leading-tight tracking-wide uppercase">{name}</p>
            ) : null}
            {settings.tagline ? (
              <p className="mt-0.5 text-[10px] tracking-[0.16em] uppercase">{settings.tagline}</p>
            ) : null}
          </>
        ) : (
          <>
            {name ? (
              <p className="font-display text-2xl leading-none tracking-wide uppercase">{name}</p>
            ) : null}
            {settings.tagline ? (
              <p className="mt-1 text-[11px] tracking-[0.2em] uppercase">{settings.tagline}</p>
            ) : null}
            {settings.address ? <p className="mt-2 text-xs font-semibold">{settings.address}</p> : null}
            {settings.landmark ? <p className="text-xs">{settings.landmark}</p> : null}
            {settings.phone ? <p className="text-xs">Ph: {settings.phone}</p> : null}
          </>
        )}
        {settings.gstin || cityLine ? (
          <p className="mt-1 text-[11px] font-medium">
            {settings.gstin ? <span>GSTIN:{settings.gstin}</span> : null}
            {settings.gstin && cityLine ? "  " : null}
            {cityLine ? <span className="uppercase">{cityLine}</span> : null}
          </p>
        ) : null}
      </div>

      <div className="mt-3 border-y border-black py-1 text-xs font-semibold">
        <div className="flex justify-between gap-2">
          <span>Bill No: {billNo}</span>
          <span>Date:{date}</span>
        </div>
      </div>

      <table className="mt-2 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-black text-left font-bold">
            <th className="py-1 pr-1">PARTICULARS</th>
            <th className="py-1 text-right">RATE</th>
            <th className="py-1 text-right">QTY</th>
            <th className="py-1 text-right">GST</th>
            <th className="py-1 text-right">AMT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((line, i) => {
            const row = gstInclusive(line.amount, line.gstRate);
            return (
              <tr key={`${line.name}-${i}`}>
                <td className="py-1 pr-1 uppercase">{line.name}</td>
                <td className="py-1 text-right tabular-nums">{money2(row.taxable / Math.max(1, line.qty))}</td>
                <td className="py-1 text-right tabular-nums">{line.qty}</td>
                <td className="py-1 text-right tabular-nums">{line.gstRate}</td>
                <td className="py-1 text-right tabular-nums">{money2(line.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-2 border-y border-black py-1 text-right text-sm font-bold">
        Total<span className="inline-block w-20 tabular-nums">{money2(total)}</span>
      </div>

      <p className="mt-2 text-center text-sm font-semibold">
        {payment} Received : {money2(paid)}
        <span className="ml-4">Balance : {money2(balance)}</span>
      </p>
      <p className="mt-1 text-xs">Tot Qty: {qty}</p>

      {settings.showGstSplit ? (
        <table className="mt-2 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-black font-bold">
              <th className="py-1 text-left">GST%</th>
              <th className="py-1 text-right">Amount</th>
              <th className="py-1 text-right">CGST%</th>
              <th className="py-1 text-right">CGST</th>
              <th className="py-1 text-right">SGST%</th>
              <th className="py-1 text-right">SGST</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-1">{gstRate}%</td>
              <td className="py-1 text-right tabular-nums">{money2(gst.taxable)}</td>
              <td className="py-1 text-right tabular-nums">{gst.cgstRate}</td>
              <td className="py-1 text-right tabular-nums">{money2(gst.cgst)}</td>
              <td className="py-1 text-right tabular-nums">{gst.sgstRate}</td>
              <td className="py-1 text-right tabular-nums">{money2(gst.sgst)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {settings.footer ? <p className="mt-4 text-center text-xs">{settings.footer}</p> : null}
      {settings.softwareBy ? <p className="mt-3 text-[10px]">{settings.softwareBy}</p> : null}
    </div>
  );
}
