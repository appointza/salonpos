import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from "@/tenant";
import {
  GST_RATES,
  LOGO_SIZE_MAX,
  LOGO_SIZE_MIN,
  LOGO_SIZE_OPTIONS,
  invoiceDisplayId,
  useBillSettings,
  type BillSettings,
} from "@/pages/Settings/bill-settings";
import { BillPreview, sampleBillLines } from "@/pages/Bill/BillPreview";
import { formatBillDate, printSalonBill } from "@/pages/Bill/print-bill";

export function BillEditor() {
  const { org } = useTenant();
  const { settings, save } = useBillSettings();
  const [form, setForm] = useState<BillSettings>(settings);

  useEffect(() => setForm(settings), [settings]);

  function persist() {
    save(form);
    toast.success("Bill saved");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const ok = printSalonBill({
              settings: form,
              salonName: org.name,
              logo: org.logo,
              billNo: invoiceDisplayId("1024", form.invoicePrefix),
              date: formatBillDate(),
              lines: sampleBillLines(form.defaultGstRate),
              payment: "Cash",
            });
            if (!ok) toast.error("Could not open the print dialog");
          }}
        >
          <Printer /> Print
        </Button>
        <Button type="button" onClick={persist}>
          <CheckCircle2 /> Save bill
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-muted/40 p-3 print:border-0 print:bg-transparent print:p-0">
          <BillPreview settings={form} salonName={org.name} logo={org.logo} />
        </div>

        <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 print:hidden">
          <div className="sm:col-span-2">
            <Label htmlFor="bill-legal" className="mb-1.5">
              Salon name on bill
            </Label>
            <Input
              id="bill-legal"
              value={form.legalName}
              placeholder="Leave blank to hide"
              onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bill-tagline" className="mb-1.5">
              Tagline
            </Label>
            <Input
              id="bill-tagline"
              value={form.tagline}
              placeholder="UNISEX BEAUTY SALON"
              onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bill-address" className="mb-1.5">
              Address
            </Label>
            <Textarea
              id="bill-address"
              rows={2}
              value={form.address}
              placeholder="296, Bharathiyar Road"
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bill-landmark" className="mb-1.5">
              Landmark
            </Label>
            <Input
              id="bill-landmark"
              value={form.landmark}
              placeholder="Near temple / landmark"
              onChange={(e) => setForm((p) => ({ ...p, landmark: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bill-city" className="mb-1.5">
              City
            </Label>
            <Input id="bill-city" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="bill-pin" className="mb-1.5">
              Pincode
            </Label>
            <Input
              id="bill-pin"
              value={form.pincode}
              onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bill-gstin" className="mb-1.5">
              GSTIN
            </Label>
            <Input
              id="bill-gstin"
              value={form.gstin}
              maxLength={15}
              placeholder="34BLKPB0626B2ZU"
              onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <Label htmlFor="bill-pan" className="mb-1.5">
              PAN
            </Label>
            <Input
              id="bill-pan"
              value={form.pan}
              maxLength={10}
              onChange={(e) => setForm((p) => ({ ...p, pan: e.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <Label htmlFor="bill-phone" className="mb-1.5">
              Phone
            </Label>
            <Input id="bill-phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="bill-email" className="mb-1.5">
              Email
            </Label>
            <Input
              id="bill-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="bill-prefix" className="mb-1.5">
              Bill number prefix
            </Label>
            <Input
              id="bill-prefix"
              value={form.invoicePrefix}
              maxLength={8}
              onChange={(e) => setForm((p) => ({ ...p, invoicePrefix: e.target.value.toUpperCase() }))}
            />
          </div>
          <div>
            <Label className="mb-1.5">Default GST %</Label>
            <Select
              value={String(form.defaultGstRate)}
              onValueChange={(v) => setForm((p) => ({ ...p, defaultGstRate: Number(v) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GST_RATES.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bill-footer" className="mb-1.5">
              Footer
            </Label>
            <Textarea
              id="bill-footer"
              rows={2}
              value={form.footer}
              onChange={(e) => setForm((p) => ({ ...p, footer: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bill-credit" className="mb-1.5">
              Small print (optional)
            </Label>
            <Input
              id="bill-credit"
              value={form.softwareBy}
              placeholder="Software By: …"
              onChange={(e) => setForm((p) => ({ ...p, softwareBy: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch checked={form.showLogo} onCheckedChange={(checked) => setForm((p) => ({ ...p, showLogo: checked }))} />
            <span className="text-sm">Show salon logo</span>
          </div>
          {form.showLogo ? (
            <div className="sm:col-span-2 space-y-2">
              <Label className="mb-1.5">Logo size</Label>
              <div className="flex flex-wrap gap-2">
                {LOGO_SIZE_OPTIONS.map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant={form.logoSize === opt.px ? "default" : "outline"}
                    onClick={() => setForm((p) => ({ ...p, logoSize: opt.px }))}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12">Small</span>
                <input
                  type="range"
                  min={LOGO_SIZE_MIN}
                  max={LOGO_SIZE_MAX}
                  value={form.logoSize}
                  className="w-full accent-primary"
                  aria-label="Logo size"
                  onChange={(e) => setForm((p) => ({ ...p, logoSize: Number(e.target.value) }))}
                />
                <span className="text-xs text-muted-foreground w-10 text-right">Big</span>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              checked={form.compactHeader}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, compactHeader: checked }))}
            />
            <span className="text-sm">Smaller name, address and phone under the logo</span>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <Switch
              checked={form.showGstSplit}
              onCheckedChange={(checked) => setForm((p) => ({ ...p, showGstSplit: checked }))}
            />
            <span className="text-sm">Show CGST / SGST table</span>
          </div>
        </div>
      </div>
    </div>
  );
}
