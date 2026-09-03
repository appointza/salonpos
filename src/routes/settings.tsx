import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { CheckCircle2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWhatsAppSettings, type WhatsAppSettings } from "@/lib/whatsapp";
import { useTenant } from "@/lib/tenant";
import { useCollection } from "@/lib/store";

const title = "Settings — WhatsApp API — Luxe Salon CRM";
const description = "Connect the Meta WhatsApp Business API used for receipts and campaigns.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Page,
});

const FIELDS: { name: keyof WhatsAppSettings; label: string; placeholder: string }[] = [
  { name: "displayNumber", label: "WhatsApp business number", placeholder: "+91 90000 00000" },
  { name: "phoneNumberId", label: "Phone number ID", placeholder: "1098xxxxxxxxxxx" },
  { name: "businessAccountId", label: "WhatsApp business account ID", placeholder: "2299xxxxxxxxxxx" },
  { name: "apiKey", label: "Permanent access token", placeholder: "EAAG…" },
  { name: "webhookToken", label: "Webhook verify token", placeholder: "luxe-verify-token" },
  { name: "apiVersion", label: "Graph API version", placeholder: "v21.0" },
];

function Page() {
  const { settings, save, isConfigured } = useWhatsAppSettings();
  const { org, scopeLabel } = useTenant();
  const { rows: messages } = useCollection("whatsappMessages");
  const [form, setForm] = useState(settings);

  useEffect(() => setForm(settings), [settings]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {org.name} · {scopeLabel} — credentials are stored per organisation.
        </p>
      </header>

      <section className="max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PlugZap className="size-5 text-primary" />
            <h2 className="font-display text-lg">Meta WhatsApp Business API</h2>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <Label htmlFor={f.name} className="mb-1.5">
                {f.label}
              </Label>
              <Input
                id={f.name}
                value={String(form[f.name] ?? "")}
                placeholder={f.placeholder}
                type={f.name === "apiKey" ? "password" : "text"}
                onChange={(e) => setForm((p) => ({ ...p, [f.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => {
              save({ ...form, connected: true });
              toast.success("WhatsApp API connected", { description: form.displayNumber || org.name });
            }}
          >
            <CheckCircle2 /> Save & connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              save({ ...form, connected: false });
              toast.message("Disconnected — messages will be queued");
            }}
          >
            Disconnect
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg">Message log</h2>
          <Badge variant="secondary">{messages.length} messages</Badge>
        </div>
        {messages.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No WhatsApp messages sent from this location yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((m) => (
              <li key={String(m.id)} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p className="font-medium">
                    {String(m["recipient"])} · {String(m["to"])}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {String(m["kind"])} {String(m["reference"])} · {String(m["sentAt"])}
                  </p>
                </div>
                <Badge variant={String(m["status"]).startsWith("Sent") ? "default" : "secondary"}>
                  {String(m["status"])}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
