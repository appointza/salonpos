import { useMemo, useState } from "react";
import { Megaphone, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CrudPage } from "@/components/CrudPage";
import { modules } from "@/lib/modules";
import { useCollection, type Row } from "@/lib/store";
import { useTenant } from "@/lib/tenant";
import { fillTemplate, useWhatsAppSender, WHATSAPP_TEMPLATES } from "@/lib/whatsapp";

const title = "Marketing Campaigns — Luxe Salon CRM";
const description = "Build WhatsApp templates, target customer segments and track message delivery.";

const TABS = [
  { key: "send", label: "WhatsApp campaign" },
  { key: "templates", label: "Templates" },
  { key: "log", label: "Message status" },
  { key: "records", label: "Campaign records" },
] as const;

const SEGMENTS = ["All customers", "Gold & Platinum", "Lapsed 60+ days", "Members only", "Birthday this month"];

export function Page() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("send");
  const { org, scopeLabel } = useTenant();
  const { rows: customers } = useCollection("customers");
  const { rows: templates, create: createTemplate, remove: removeTemplate } = useCollection(WHATSAPP_TEMPLATES);
  const { rows: messages } = useCollection("whatsappMessages");
  const { rows: campaigns, create: createCampaign } = useCollection("campaigns");
  const { send, isConfigured } = useWhatsAppSender();

  const [segment, setSegment] = useState(SEGMENTS[0]!);
  const [selected, setSelected] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [body, setBody] = useState(
    "Hi {{name}}, {{org}} {{location}} has a special this week — 20% off colour services. Reply BOOK to reserve. {{website}}",
  );
  const [campaignName, setCampaignName] = useState("Weekly WhatsApp offer");
  const [newTemplate, setNewTemplate] = useState({ name: "", category: "Marketing", body: "" });

  const memberIds = useMemo(
    () => new Set(customers.filter((c) => String(c["membershipId"] ?? "")).map((c) => String(c.id))),
    [customers],
  );

  const audience = useMemo(() => {
    const month = new Date().getMonth();
    const daysAgo = (d: string) => (Date.now() - new Date(d).getTime()) / 86400000;
    return customers.filter((c) => {
      switch (segment) {
        case "Gold & Platinum":
          return ["Gold", "Platinum"].includes(String(c["tier"]));
        case "Lapsed 60+ days":
          return c["lastVisit"] ? daysAgo(String(c["lastVisit"])) > 60 : true;
        case "Members only":
          return memberIds.has(String(c.id));
        case "Birthday this month":
          return c["birthday"] ? new Date(String(c["birthday"])).getMonth() === month : false;
        default:
          return true;
      }
    });
  }, [customers, segment, memberIds]);

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function preview(c: Row) {
    return fillTemplate(body, {
      name: String(c["name"] ?? ""),
      org: org.name,
      location: scopeLabel,
      website: org.website,
      points: String(c["points"] ?? 0),
      tier: String(c["tier"] ?? ""),
    });
  }

  function sendCampaign() {
    const targets = audience.filter((c) => selected.includes(String(c.id)));
    if (targets.length === 0) return void toast.error("Select at least one customer");
    for (const c of targets) {
      send({
        to: String(c["phone"] ?? ""),
        recipient: String(c["name"] ?? ""),
        body: preview(c),
        kind: "Campaign",
        reference: campaignName,
      });
    }
    createCampaign({
      id: `CP-${Math.floor(100 + Math.random() * 899)}`,
      name: campaignName,
      channel: "WhatsApp",
      segment,
      audience: audience.length,
      sent: targets.length,
      opened: 0,
      converted: 0,
      budget: 0,
      schedule: new Date().toISOString().slice(0, 10),
      status: isConfigured ? "Running" : "Draft",
    });
    setSelected([]);
    toast.success(`${targets.length} WhatsApp messages ${isConfigured ? "sent" : "queued"}`, {
      description: `${campaignName} · ${segment}`,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {org.name} · {scopeLabel} — {campaigns.length} campaigns, {messages.length} messages logged.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === t.key ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === "send" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Megaphone className="size-5 text-primary" />
              <h2 className="font-display text-lg">Compose</h2>
            </div>
            <div>
              <Label htmlFor="cp-name" className="mb-1.5">
                Campaign name
              </Label>
              <Input id="cp-name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5">Segment</Label>
              <Select
                value={segment}
                onValueChange={(v) => {
                  setSegment(v);
                  setSelected([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5">Template</Label>
              <Select
                value={templateId}
                onValueChange={(v) => {
                  setTemplateId(v);
                  const t = templates.find((x) => String(x.id) === v);
                  if (t) setBody(String(t["body"]));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Use a saved template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No templates yet
                    </SelectItem>
                  ) : (
                    templates.map((t) => (
                      <SelectItem key={String(t.id)} value={String(t.id)}>
                        {String(t["name"])}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cp-body" className="mb-1.5">
                Message — variables {"{{name}} {{org}} {{location}} {{points}} {{website}}"}
              </Label>
              <Textarea id="cp-body" rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {audience[0] ? preview(audience[0]) : "No customers in this segment."}
            </p>
            <Button className="w-full" onClick={sendCampaign}>
              <Send /> Send to {selected.length} selected
            </Button>
            {!isConfigured && (
              <p className="text-xs text-muted-foreground">
                Meta WhatsApp API is not connected — messages will be queued. Configure it in Settings.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border p-4">
              <h2 className="font-display text-lg">Audience · {audience.length}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSelected(
                    selected.length === audience.length ? [] : audience.map((c) => String(c.id)),
                  )
                }
              >
                {selected.length === audience.length && audience.length > 0 ? "Clear all" : "Select all eligible"}
              </Button>
            </div>
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {audience.length === 0 ? (
                <li className="p-6 text-sm text-muted-foreground">No customers match this segment here.</li>
              ) : (
                audience.map((c) => (
                  <li key={String(c.id)} className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={selected.includes(String(c.id))}
                      onCheckedChange={() => toggle(String(c.id))}
                      aria-label={`Select ${String(c["name"])}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{String(c["name"])}</p>
                      <p className="text-xs text-muted-foreground">
                        {String(c["phone"])} · last visit {String(c["lastVisit"] ?? "—")}
                      </p>
                    </div>
                    <Badge variant="secondary">{String(c["tier"] ?? "—")}</Badge>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg">New template</h2>
            <div>
              <Label htmlFor="tp-name" className="mb-1.5">
                Name
              </Label>
              <Input
                id="tp-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="mb-1.5">Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(v) => setNewTemplate((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Marketing", "Utility", "Authentication"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tp-body" className="mb-1.5">
                Body
              </Label>
              <Textarea
                id="tp-body"
                rows={5}
                value={newTemplate.body}
                onChange={(e) => setNewTemplate((p) => ({ ...p, body: e.target.value }))}
              />
            </div>
            <Button
              onClick={() => {
                if (!newTemplate.name || !newTemplate.body) return void toast.error("Name and body are required");
                createTemplate({
                  id: `TPL-${Math.floor(100 + Math.random() * 899)}`,
                  name: newTemplate.name,
                  category: newTemplate.category,
                  body: newTemplate.body,
                  status: "Approved",
                  createdAt: new Date().toISOString().slice(0, 10),
                });
                setNewTemplate({ name: "", category: "Marketing", body: "" });
                toast.success("Template saved");
              }}
            >
              <Plus /> Save template
            </Button>
          </section>
          <section className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <h2 className="font-display text-lg">Saved templates</h2>
            </div>
            {templates.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {templates.map((t) => (
                  <li key={String(t.id)} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {String(t["name"])} <Badge variant="secondary">{String(t["category"])}</Badge>
                      </p>
                      <p className="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{String(t["body"])}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${String(t["name"])}`}
                      onClick={() => removeTemplate(String(t.id))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "log" && (
        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-lg">Message status</h2>
          </div>
          {messages.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No WhatsApp messages yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {messages.map((m) => (
                <li key={String(m.id)} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {String(m["recipient"])} · {String(m["to"])}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(m["kind"])} · {String(m["reference"])} · {String(m["sentAt"])}
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
      )}

      {tab === "records" && <CrudPage module={modules.campaigns} />}
    </div>
  );
}
