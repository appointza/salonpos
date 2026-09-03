import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { slugify, useTenant } from "@/lib/tenant";
import {
  defaultHours,
  defaultSlots,
  generateSlots,
  uuid,
  useAuth,
  type DayHours,
  type Organization,
  type OrgService,
  type OrgStaff,
  type Role,
  type SlotConfig,
} from "@/lib/auth";

const title = "Register your organization — Luxe Salon CRM";
const description =
  "Create your business account, configure opening hours, appointment slots, services and staff in a guided onboarding wizard.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RegisterPage,
});

const DRAFT_KEY = "salon-crm-onboarding-draft-v1";

type Draft = {
  step: number;
  orgId: string;
  admin: { name: string; email: string; phone: string; password: string; confirm: string; verified: boolean };
  otp: string;
  org: { name: string; businessType: string; businessCategory: string; outletCount: string };
  slug: string;
  profile: { logo: string; description: string; phone: string; email: string; website: string; domain: string; brandColor: string; gst: string };
  address: { country: string; state: string; city: string; line: string; pincode: string };
  outlet: { name: string; phone: string; email: string; address: string; status: string };
  hours: DayHours[];
  slots: SlotConfig;
  services: OrgService[];
  staff: OrgStaff[];
  features: string[];
  menu: { mode: string; items: { name: string; category: string; price: string }[] };
  loyalty: { type: string; target: string; reward: string; expiry: string; rules: string };
  reward: { name: string; type: string; value: string; conditions: string };
  plan: string;
  paid: boolean;
};

const emptyDraft = (): Draft => ({
  step: 0,
  orgId: uuid(),
  admin: { name: "", email: "", phone: "", password: "", confirm: "", verified: false },
  otp: "",
  org: { name: "", businessType: "Salon", businessCategory: "Beauty & Wellness", outletCount: "1" },
  slug: "",
  profile: { logo: "", description: "", phone: "", email: "", website: "", domain: "", brandColor: "#2f5bff", gst: "" },
  address: { country: "India", state: "", city: "", line: "", pincode: "" },
  outlet: { name: "", phone: "", email: "", address: "", status: "Active" },
  hours: defaultHours(),
  slots: defaultSlots(),
  services: [],
  staff: [],
  features: ["QR Codes", "Loyalty Program"],
  menu: { mode: "skip", items: [] },
  loyalty: { type: "Stamp-based", target: "10", reward: "Free haircut", expiry: "", rules: "One stamp per visit" },
  reward: { name: "", type: "Discount %", value: "", conditions: "" },
  plan: "Growth",
  paid: false,
});

const STEPS = [
  "Admin account",
  "Verify",
  "Organization",
  "Your URL",
  "Business profile",
  "Address",
  "First outlet",
  "Opening hours",
  "Appointment slots",
  "Services",
  "Staff & stylists",
  "Features",
  "Digital menu",
  "Loyalty & rewards",
  "Subscription",
  "Payment",
  "Summary",
];

const FEATURES = [
  "QR Codes",
  "Digital Menu / Catalog",
  "AI Menu Import",
  "Loyalty Program",
  "Rewards",
  "Customer Check-in",
  "Scratch & Win",
  "WhatsApp Ordering",
  "Staff Management",
];

const PLANS = [
  { name: "Starter", price: "₹999", cycle: "per month", staff: "5 staff", customers: "1,000 customers", outlets: "1 outlet", features: ["QR codes", "Appointments", "Basic reports"] },
  { name: "Growth", price: "₹2,499", cycle: "per month", staff: "20 staff", customers: "10,000 customers", outlets: "3 outlets", features: ["Everything in Starter", "Loyalty & rewards", "WhatsApp ordering", "Campaigns"] },
  { name: "Enterprise", price: "₹5,999", cycle: "per month", staff: "Unlimited staff", customers: "Unlimited customers", outlets: "Unlimited outlets", features: ["Everything in Growth", "White-label app", "Franchise console", "Priority support"] },
];

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs tracking-wide text-muted-foreground uppercase">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function StepShell({ title: t, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl tracking-tight">{t}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft(), ...(JSON.parse(raw) as Draft) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draft, loaded]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const step = draft.step;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  const { tenants } = useTenant();
  const [origin, setOrigin] = useState("https://ui-buddy-crud.lovable.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const takenSlugs = useMemo(() => tenants.map((t) => t.slug), [tenants]);
  const bookingUrl = `${origin}/${draft.slug || "your-business"}`;
  const slugAvailable =
    !!draft.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug) && !takenSlugs.includes(draft.slug);

  const slotPreview = useMemo(
    () => generateSlots(draft.hours, Number(draft.slots.duration || 0), Number(draft.slots.buffer || 0)),
    [draft.hours, draft.slots],
  );

  function validate(): string | null {
    if (step === 0) {
      const a = draft.admin;
      if (!a.name.trim() || !a.email.trim() || !a.phone.trim()) return "Full name, email and mobile number are required.";
      if (!/^\S+@\S+\.\S+$/.test(a.email)) return "Enter a valid email address.";
      if (a.password.length < 6) return "Password must be at least 6 characters.";
      if (a.password !== a.confirm) return "Passwords do not match.";
    }
    if (step === 1 && draft.otp.replace(/\D/g, "").length !== 6) return "Enter the 6-digit verification code (demo: any 6 digits).";
    if (step === 2 && !draft.org.name.trim()) return "Organization name is required.";
    if (step === 3) {
      if (!draft.slug.trim()) return "Choose a public booking URL for your business.";
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug)) return "URLs can only use lowercase letters, numbers and hyphens.";
      if (takenSlugs.includes(draft.slug)) return "That URL is already taken — try another one.";
    }
    if (step === 6 && !draft.outlet.name.trim()) return "Outlet name is required.";
    if (step === 7 && !draft.hours.some((h) => h.open)) return "Select at least one working day.";
    if (step === 8 && Number(draft.slots.duration) <= 0) return "Choose a slot duration.";
    if (step === 9 && draft.services.length === 0) return "Add at least one service — this step is mandatory.";
    return null;
  }

  function next() {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (step === 1) set("admin", { ...draft.admin, verified: true });
    setDraft((d) => ({ ...d, step: Math.min(d.step + 1, STEPS.length - 1) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setDraft((d) => ({ ...d, step: Math.max(0, d.step - 1) }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finish() {
    const org: Organization = {
      orgId: draft.orgId,
      name: draft.org.name,
      businessType: draft.org.businessType,
      businessCategory: draft.org.businessCategory,
      outletCount: Number(draft.org.outletCount || 1),
      createdAt: new Date().toISOString(),
      plan: draft.plan,
      profile: { ...draft.profile, slug: draft.slug },
      address: draft.address,
      outlet: draft.outlet,
      hours: draft.hours,
      slots: draft.slots,
      services: draft.services,
      staff: draft.staff,
      features: draft.features,
      menu: draft.menu,
      loyalty: draft.loyalty,
      reward: draft.reward,
      completed: [
        "organization",
        "hours",
        "slots",
        ...(draft.services.length ? ["services"] : []),
        ...(draft.staff.length ? ["staff"] : []),
        ...(draft.menu.items.length ? ["menu"] : []),
        ...(draft.paid ? ["subscription"] : []),
      ],
    };
    completeOnboarding(org, { name: draft.admin.name, email: draft.admin.email, phone: draft.admin.phone });
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    toast.success("Organization created");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="font-display text-lg">Luxe Salon</span>
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already registered? Log in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </span>
            <span>{progress}% complete</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                type="button"
                onClick={() => i < step && setDraft((d) => ({ ...d, step: i }))}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  i === step && "border-primary bg-primary text-primary-foreground",
                  i < step && "border-border text-muted-foreground hover:bg-accent",
                  i > step && "border-dashed border-border text-muted-foreground/60",
                )}
              >
                {i < step && <Check className="mr-1 inline size-3" />}
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {step === 0 && (
            <StepShell title="Create your admin account" hint="You will be the organization ADMIN with full access to this business.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" required value={draft.admin.name} onChange={(v) => set("admin", { ...draft.admin, name: v })} />
                <Field label="Email address" required type="email" value={draft.admin.email} onChange={(v) => set("admin", { ...draft.admin, email: v })} />
                <Field label="Mobile number" required value={draft.admin.phone} onChange={(v) => set("admin", { ...draft.admin, phone: v })} />
                <div />
                <Field label="Password" required type="password" value={draft.admin.password} onChange={(v) => set("admin", { ...draft.admin, password: v })} />
                <Field label="Confirm password" required type="password" value={draft.admin.confirm} onChange={(v) => set("admin", { ...draft.admin, confirm: v })} />
              </div>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell title="Verify your account" hint={`We sent a 6-digit code to ${draft.admin.email || "your email"} and ${draft.admin.phone || "your mobile"}. Demo mode: enter any 6 digits.`}>
              <div className="max-w-xs">
                <Field label="Verification code" required value={draft.otp} onChange={(v) => set("otp", v)} placeholder="123456" />
              </div>
              <button type="button" className="text-sm text-primary hover:underline" onClick={() => toast.success("Verification code resent")}>
                Resend code
              </button>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell title="Create your organization" hint="A unique organization ID (UUID) is generated and attached to every record you create.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization name" required value={draft.org.name} onChange={(v) => set("org", { ...draft.org, name: v })} />
                <Field label="Business type" value={draft.org.businessType} onChange={(v) => set("org", { ...draft.org, businessType: v })} />
                <Field label="Business category" value={draft.org.businessCategory} onChange={(v) => set("org", { ...draft.org, businessCategory: v })} />
                <Field label="Number of outlets" type="number" value={draft.org.outletCount} onChange={(v) => set("org", { ...draft.org, outletCount: v })} />
                <Field label="Business domain name" value={draft.profile.domain} onChange={(v) => set("profile", { ...draft.profile, domain: v })} placeholder="luxesalon.in" />
                <Field label="Website URL" value={draft.profile.website} onChange={(v) => set("profile", { ...draft.profile, website: v })} placeholder="https://www.luxesalon.in" />
              </div>
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm">
                <span className="text-muted-foreground">Generated orgId:</span>{" "}
                <code className="font-mono text-xs">{draft.orgId}</code>
              </div>
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="Claim your space."
              hint="Choose a URL for your public booking page. Customers will use this link to browse services and book appointments."
            >
              <div className="max-w-2xl space-y-3">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">Your booking link</Label>
                <div className="flex overflow-hidden rounded-lg border border-border focus-within:ring-2 focus-within:ring-ring">
                  <span className="hidden shrink-0 items-center bg-muted px-3 text-sm text-muted-foreground sm:flex">
                    {origin.replace(/^https?:\/\//, "")}/
                  </span>
                  <Input
                    className="rounded-none border-0 focus-visible:ring-0"
                    value={draft.slug}
                    placeholder="your-business-name"
                    onChange={(e) => set("slug", slugify(e.target.value))}
                  />
                </div>
                {draft.org.name && !draft.slug && (
                  <Button variant="outline" size="sm" onClick={() => set("slug", slugify(draft.org.name))}>
                    Use “{slugify(draft.org.name)}”
                  </Button>
                )}
                {draft.slug &&
                  (slugAvailable ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-primary">
                        <Check className="size-4" /> Available!
                      </p>
                      <p className="mt-1 break-all text-muted-foreground">{bookingUrl} is yours to claim.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                      {takenSlugs.includes(draft.slug)
                        ? "That URL is already taken — try another one."
                        : "Use lowercase letters, numbers and hyphens only."}
                    </div>
                  ))}
                <p className="text-xs text-muted-foreground">
                  Share this link on WhatsApp, Instagram or Google — bookings made here sync straight into your POS
                  calendar.
                </p>
              </div>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell title="Business profile" hint="Shown to customers on booking pages, QR menus and receipts.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Logo URL" value={draft.profile.logo} onChange={(v) => set("profile", { ...draft.profile, logo: v })} placeholder="https://…" />
                <Field label="Business phone" value={draft.profile.phone} onChange={(v) => set("profile", { ...draft.profile, phone: v })} />
                <Field label="Business email" value={draft.profile.email} onChange={(v) => set("profile", { ...draft.profile, email: v })} />
                <Field label="Website" value={draft.profile.website} onChange={(v) => set("profile", { ...draft.profile, website: v })} />
                <Field label="Brand colour" value={draft.profile.brandColor} onChange={(v) => set("profile", { ...draft.profile, brandColor: v })} placeholder="#2f5bff" />
                <Field label="Domain name" value={draft.profile.domain} onChange={(v) => set("profile", { ...draft.profile, domain: v })} placeholder="luxesalon.in" />
                <Field label="GST number (optional)" value={draft.profile.gst} onChange={(v) => set("profile", { ...draft.profile, gst: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">Business description</Label>
                <Textarea rows={4} value={draft.profile.description} onChange={(e) => set("profile", { ...draft.profile, description: e.target.value })} />
              </div>
            </StepShell>
          )}

          {step === 5 && (
            <StepShell title="Business address" hint="Used for invoices, maps and outlet defaults.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Country" value={draft.address.country} onChange={(v) => set("address", { ...draft.address, country: v })} />
                <Field label="State" value={draft.address.state} onChange={(v) => set("address", { ...draft.address, state: v })} />
                <Field label="City" value={draft.address.city} onChange={(v) => set("address", { ...draft.address, city: v })} />
                <Field label="Pincode" value={draft.address.pincode} onChange={(v) => set("address", { ...draft.address, pincode: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">Address</Label>
                <Textarea rows={3} value={draft.address.line} onChange={(e) => set("address", { ...draft.address, line: e.target.value })} />
              </div>
            </StepShell>
          )}

          {step === 6 && (
            <StepShell title="Create your first outlet" hint="Add more branches later from the Franchises & outlets module.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Outlet name" required value={draft.outlet.name} onChange={(v) => set("outlet", { ...draft.outlet, name: v })} />
                <Field label="Contact number" value={draft.outlet.phone} onChange={(v) => set("outlet", { ...draft.outlet, phone: v })} />
                <Field label="Outlet email" value={draft.outlet.email} onChange={(v) => set("outlet", { ...draft.outlet, email: v })} />
                <Field label="Status" value={draft.outlet.status} onChange={(v) => set("outlet", { ...draft.outlet, status: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">Outlet address</Label>
                <Textarea rows={3} value={draft.outlet.address} onChange={(e) => set("outlet", { ...draft.outlet, address: e.target.value })} />
              </div>
              <Button variant="outline" size="sm" onClick={() => set("outlet", { ...draft.outlet, address: draft.address.line, phone: draft.profile.phone })}>
                Copy from business address
              </Button>
            </StepShell>
          )}

          {step === 7 && (
            <StepShell title="Opening hours" hint="Mandatory. Set different timings per day, or mark a day as closed.">
              <div className="divide-y divide-border rounded-lg border border-border">
                {draft.hours.map((h, i) => (
                  <div key={h.day} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Switch
                      checked={h.open}
                      onCheckedChange={(checked) =>
                        set("hours", draft.hours.map((x, xi) => (xi === i ? { ...x, open: checked } : x)))
                      }
                    />
                    <span className="w-24 text-sm">{h.day}</span>
                    {h.open ? (
                      <div className="flex items-center gap-2">
                        <Input type="time" className="w-32" value={h.from} onChange={(e) => set("hours", draft.hours.map((x, xi) => (xi === i ? { ...x, from: e.target.value } : x)))} />
                        <span className="text-muted-foreground">to</span>
                        <Input type="time" className="w-32" value={h.to} onChange={(e) => set("hours", draft.hours.map((x, xi) => (xi === i ? { ...x, to: e.target.value } : x)))} />
                      </div>
                    ) : (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const first = draft.hours[0]!;
                  set("hours", draft.hours.map((x) => (x.open ? { ...x, from: first.from, to: first.to } : x)));
                  toast.success("Applied Monday timings to all open days");
                }}
              >
                Apply first day's timings to all
              </Button>
            </StepShell>
          )}

          {step === 8 && (
            <StepShell title="Appointment slots & booking rules" hint="Slots are generated automatically from your opening hours.">
              <div className="space-y-2">
                <Label className="text-xs tracking-wide text-muted-foreground uppercase">Slot duration</Label>
                <div className="flex flex-wrap gap-2">
                  {["15", "30", "45", "60"].map((d) => (
                    <Button key={d} variant={draft.slots.duration === d ? "default" : "outline"} size="sm" onClick={() => set("slots", { ...draft.slots, duration: d })}>
                      {d} min
                    </Button>
                  ))}
                  <Input className="w-36" type="number" placeholder="Custom (min)" value={["15", "30", "45", "60"].includes(draft.slots.duration) ? "" : draft.slots.duration} onChange={(e) => set("slots", { ...draft.slots, duration: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Buffer between appointments (min)" type="number" value={draft.slots.buffer} onChange={(v) => set("slots", { ...draft.slots, buffer: v })} />
                <Field label="Max bookings per slot" type="number" value={draft.slots.maxPerSlot} onChange={(v) => set("slots", { ...draft.slots, maxPerSlot: v })} />
                <Field label="Advance booking days" type="number" value={draft.slots.advanceDays} onChange={(v) => set("slots", { ...draft.slots, advanceDays: v })} />
                <Field label="Minimum booking notice (hours)" type="number" value={draft.slots.minNotice} onChange={(v) => set("slots", { ...draft.slots, minNotice: v })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={draft.slots.onlineBooking} onCheckedChange={(c) => set("slots", { ...draft.slots, onlineBooking: c })} />
                <span className="text-sm">Allow customers to book online</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-xs tracking-wide text-muted-foreground uppercase">Generated slots preview</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {slotPreview.length === 0 && <span className="text-sm text-muted-foreground">Configure hours and duration to preview slots.</span>}
                  {slotPreview.slice(0, 24).map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </div>
            </StepShell>
          )}

          {step === 9 && (
            <StepShell title="Service categories & services" hint="Mandatory. At least one service is needed to accept bookings.">
              <ServiceEditor draft={draft} onChange={(services) => set("services", services)} />
            </StepShell>
          )}

          {step === 10 && (
            <StepShell title="Add staff & stylists" hint="Roles: ADMIN, STAFF, STYLIST. SUPER_ADMIN is reserved for the platform owner.">
              <StaffEditor draft={draft} onChange={(staff) => set("staff", staff)} />
            </StepShell>
          )}

          {step === 11 && (
            <StepShell title="Select features to configure" hint="All optional — you can enable the rest later from your dashboard.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => {
                  const on = draft.features.includes(f);
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => set("features", on ? draft.features.filter((x) => x !== f) : [...draft.features, f])}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-4 text-left text-sm transition-colors",
                        on ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                      )}
                    >
                      {f}
                      {on && <Check className="size-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </StepShell>
          )}

          {step === 12 && (
            <StepShell title="Digital menu / catalog" hint="Create manually, upload an existing menu for AI extraction, or skip.">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { id: "manual", label: "Create manually" },
                  { id: "upload", label: "Upload & AI import" },
                  { id: "skip", label: "Skip for now" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => set("menu", { ...draft.menu, mode: m.id })}
                    className={cn(
                      "rounded-lg border p-4 text-sm transition-colors",
                      draft.menu.mode === m.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {draft.menu.mode === "upload" && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <Upload className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Image, PDF, Excel or CSV</p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        set("menu", {
                          mode: "upload",
                          items: [
                            { name: "Signature Haircut", category: "Hair", price: "1200" },
                            { name: "Keratin Treatment", category: "Hair", price: "4500" },
                            { name: "Classic Manicure", category: "Nails", price: "900" },
                          ],
                        });
                        toast.success("AI extracted 3 items — review and edit below");
                      }}
                    >
                      Simulate upload & AI extract
                    </Button>
                  </div>
                </div>
              )}
              {(draft.menu.mode === "manual" || draft.menu.items.length > 0) && (
                <MenuEditor items={draft.menu.items} onChange={(items) => set("menu", { ...draft.menu, items })} />
              )}
            </StepShell>
          )}

          {step === 13 && (
            <StepShell title="Loyalty & rewards" hint="Optional. Set up a stamp or points program and your first reward.">
              <div className="flex gap-2">
                {["Stamp-based", "Points-based"].map((t) => (
                  <Button key={t} variant={draft.loyalty.type === t ? "default" : "outline"} size="sm" onClick={() => set("loyalty", { ...draft.loyalty, type: t })}>
                    {t}
                  </Button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={draft.loyalty.type === "Stamp-based" ? "Visits / stamps required" : "Points required"} type="number" value={draft.loyalty.target} onChange={(v) => set("loyalty", { ...draft.loyalty, target: v })} />
                <Field label="Reward on completion" value={draft.loyalty.reward} onChange={(v) => set("loyalty", { ...draft.loyalty, reward: v })} />
                <Field label="Expiry date" type="date" value={draft.loyalty.expiry} onChange={(v) => set("loyalty", { ...draft.loyalty, expiry: v })} />
                <Field label="Validity & redemption rules" value={draft.loyalty.rules} onChange={(v) => set("loyalty", { ...draft.loyalty, rules: v })} />
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold">First reward</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label="Reward name" value={draft.reward.name} onChange={(v) => set("reward", { ...draft.reward, name: v })} />
                  <Field label="Reward type" value={draft.reward.type} onChange={(v) => set("reward", { ...draft.reward, type: v })} />
                  <Field label="Value" value={draft.reward.value} onChange={(v) => set("reward", { ...draft.reward, value: v })} />
                  <Field label="Conditions" value={draft.reward.conditions} onChange={(v) => set("reward", { ...draft.reward, conditions: v })} />
                </div>
              </div>
            </StepShell>
          )}

          {step === 14 && (
            <StepShell title="Choose a subscription plan" hint="Change or upgrade anytime from Subscription settings.">
              <div className="grid gap-4 lg:grid-cols-3">
                {PLANS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => set("plan", p.name)}
                    className={cn(
                      "rounded-xl border p-5 text-left transition-colors",
                      draft.plan === p.name ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                    )}
                  >
                    <p className="font-display text-lg">{p.name}</p>
                    <p className="mt-1 text-2xl">{p.price} <span className="text-xs text-muted-foreground">{p.cycle}</span></p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <li>{p.staff}</li>
                      <li>{p.customers}</li>
                      <li>{p.outlets}</li>
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5">
                          <Check className="mt-0.5 size-3.5 text-primary" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {step === 15 && (
            <StepShell title="Payment" hint={`Secure checkout for the ${draft.plan} plan. This is a demo — no real payment is taken.`}>
              <div className="max-w-md space-y-4 rounded-lg border border-border p-5">
                <Field label="Card number" value="" onChange={() => undefined} placeholder="4242 4242 4242 4242" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Expiry" value="" onChange={() => undefined} placeholder="12/29" />
                  <Field label="CVC" value="" onChange={() => undefined} placeholder="123" />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    set("paid", true);
                    toast.success(`${draft.plan} subscription activated`);
                  }}
                  disabled={draft.paid}
                >
                  {draft.paid ? "Subscription active" : `Pay & activate ${draft.plan}`}
                </Button>
                <button type="button" className="w-full text-center text-sm text-muted-foreground hover:underline" onClick={next}>
                  Start free trial instead — skip payment
                </button>
              </div>
            </StepShell>
          )}

          {step === 16 && (
            <StepShell title="Setup summary" hint="Review everything before creating your organization.">
              <dl className="grid gap-3 sm:grid-cols-2">
                <SummaryRow label="Organization" value={`${draft.org.name} · ${draft.org.businessType}`} />
                <SummaryRow label="Public booking URL" value={bookingUrl} mono />
                <SummaryRow label="orgId" value={draft.orgId} mono />
                <SummaryRow label="Admin" value={`${draft.admin.name} (${draft.admin.email})`} />
                <SummaryRow label="Outlet" value={draft.outlet.name || "—"} />
                <SummaryRow label="Opening hours" value={`${draft.hours.filter((h) => h.open).length} working days`} />
                <SummaryRow label="Appointment slots" value={`${draft.slots.duration} min · ${draft.slots.buffer} min buffer`} />
                <SummaryRow label="Services" value={`${draft.services.length} services`} />
                <SummaryRow label="Staff" value={`${draft.staff.length} team members`} />
                <SummaryRow label="Features" value={draft.features.join(", ") || "None"} />
                <SummaryRow label="Subscription" value={`${draft.plan} · ${draft.paid ? "Active" : "Trial"}`} />
              </dl>
              <Button size="lg" className="w-full sm:w-auto" onClick={finish}>
                Create organization & go to dashboard
              </Button>
            </StepShell>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              <ChevronLeft /> Back
            </Button>
            <div className="flex items-center gap-2">
              {[10, 11, 12, 13, 14, 15].includes(step) && (
                <Button variant="ghost" onClick={next}>
                  Skip for now
                </Button>
              )}
              {step < STEPS.length - 1 && (
                <Button onClick={next}>
                  Continue <ChevronRight />
                </Button>
              )}
            </div>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Your progress is saved automatically in this browser.</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <dt className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</dt>
      <dd className={cn("mt-1 text-sm break-words", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}

function ServiceEditor({ draft, onChange }: { draft: Draft; onChange: (s: OrgService[]) => void }) {
  const [form, setForm] = useState({ name: "", category: "Hair", description: "", duration: "45", price: "", discountPrice: "", status: "Active", staff: "" });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <Field label="Service name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Category" value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
        <Field label="Duration (min)" type="number" value={form.duration} onChange={(v) => setForm({ ...form, duration: v })} />
        <Field label="Price (₹)" type="number" value={form.price} onChange={(v) => setForm({ ...form, price: v })} />
        <Field label="Discounted price (₹)" type="number" value={form.discountPrice} onChange={(v) => setForm({ ...form, discountPrice: v })} />
        <Field label="Staff / stylists" value={form.staff} onChange={(v) => setForm({ ...form, staff: v })} placeholder="Comma separated" />
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs tracking-wide text-muted-foreground uppercase">Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <Button
            size="sm"
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Service name is required");
                return;
              }
              onChange([...draft.services, { id: uuid(), orgId: draft.orgId, ...form }]);
              setForm({ ...form, name: "", description: "", price: "", discountPrice: "" });
              toast.success("Service added");
            }}
          >
            <Plus /> Add service
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {draft.services.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {s.category} · {s.duration} min · ₹{s.price || "0"}
                {s.staff && ` · ${s.staff}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onChange(draft.services.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StaffEditor({ draft, onChange }: { draft: Draft; onChange: (s: OrgStaff[]) => void }) {
  const [form, setForm] = useState<{ name: string; phone: string; email: string; role: Role; services: string; workingHours: string; status: string }>({
    name: "",
    phone: "",
    email: "",
    role: "STYLIST",
    services: "",
    workingHours: "09:00 - 18:00",
    status: "Active",
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Mobile number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <div className="space-y-1.5">
          <Label className="text-xs tracking-wide text-muted-foreground uppercase">Role</Label>
          <div className="flex gap-2">
            {(["ADMIN", "STAFF", "STYLIST"] as Role[]).map((r) => (
              <Button key={r} size="sm" variant={form.role === r ? "default" : "outline"} onClick={() => setForm({ ...form, role: r })}>
                {r}
              </Button>
            ))}
          </div>
        </div>
        <Field label="Assigned services" value={form.services} onChange={(v) => setForm({ ...form, services: v })} placeholder="Comma separated" />
        <Field label="Working hours" value={form.workingHours} onChange={(v) => setForm({ ...form, workingHours: v })} />
        <div>
          <Button
            size="sm"
            onClick={() => {
              if (!form.name.trim()) {
                toast.error("Name is required");
                return;
              }
              onChange([...draft.staff, { id: uuid(), orgId: draft.orgId, ...form }]);
              setForm({ ...form, name: "", phone: "", email: "", services: "" });
              toast.success("Team member added");
            }}
          >
            <Plus /> Add team member
          </Button>
        </div>
      </div>
      <ul className="space-y-2">
        {draft.staff.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-muted-foreground">
                {s.role} · {s.workingHours}
                {s.services && ` · ${s.services}`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onChange(draft.staff.filter((x) => x.id !== s.id))} aria-label={`Remove ${s.name}`}>
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MenuEditor({ items, onChange }: { items: { name: string; category: string; price: string }[]; onChange: (i: { name: string; category: string; price: string }[]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">Review extracted items</p>
      {items.map((it, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <Input value={it.name} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))} />
          <Input value={it.category} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, category: e.target.value } : x)))} />
          <Input value={it.price} onChange={(e) => onChange(items.map((x, xi) => (xi === i ? { ...x, price: e.target.value } : x)))} />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, xi) => xi !== i))} aria-label="Remove item">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, { name: "", category: "", price: "" }])}>
        <Plus /> Add item
      </Button>
    </div>
  );
}
