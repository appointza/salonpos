import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  QrCode,
  BookOpen,
  Scissors,
  Users,
  CalendarDays,
  Gift,
  Trophy,
  ScanLine,
  Ticket,
  MessageCircle,
  IdCard,
  BarChart3,
  CreditCard,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const title = "Luxe Salon CRM — All-in-one platform for salons & studios";
const description =
  "Manage QR codes, digital menus, services, customers, appointments, loyalty, rewards, check-ins, WhatsApp ordering, staff, analytics and subscriptions in one multi-tenant platform.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: QrCode, label: "QR Codes", text: "Table, counter and campaign QR codes with live scan analytics." },
  { icon: BookOpen, label: "Digital Menus", text: "Publish menus and catalogs, or import them with AI in seconds." },
  { icon: Scissors, label: "Services", text: "Catalogue with pricing, duration, taxes and stylist mapping." },
  { icon: Users, label: "Customers", text: "Profiles, visit history, wallets, tiers and households." },
  { icon: CalendarDays, label: "Appointments", text: "Auto-generated slots from your opening hours and buffers." },
  { icon: Gift, label: "Loyalty Programs", text: "Stamp or points programs with rules and expiry control." },
  { icon: Trophy, label: "Rewards", text: "Free services, percentage or fixed-value rewards." },
  { icon: ScanLine, label: "Check-ins", text: "Fast front-desk check-in linked to loyalty and queues." },
  { icon: Ticket, label: "Scratch & Win", text: "Gamified campaigns that bring customers back." },
  { icon: MessageCircle, label: "WhatsApp Ordering", text: "Take orders and confirmations right inside WhatsApp." },
  { icon: IdCard, label: "Staff", text: "Roles, permissions, rosters, attendance and commissions." },
  { icon: BarChart3, label: "Analytics", text: "Revenue, retention and outlet performance dashboards." },
  { icon: CreditCard, label: "Subscriptions", text: "Plans, usage limits and secure checkout." },
  { icon: Settings, label: "Business Settings", text: "Outlets, opening hours, booking rules and branding." },
];

const STEPS = [
  "Create admin account",
  "Verify email / mobile",
  "Create organization",
  "Opening hours & slots",
  "Services & staff",
  "Go live",
];

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-display text-base leading-none">Luxe Salon</p>
              <p className="mt-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">CRM Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">Register organization</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-[11px] tracking-[0.24em] text-muted-foreground uppercase">Multi-tenant business platform</p>
          <h1 className="font-display mt-4 max-w-3xl text-4xl leading-tight tracking-tight sm:text-6xl">
            Everything your salon, studio or spa needs — in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Register your business, get your own isolated workspace, and manage bookings, customers, loyalty, staff and
            growth campaigns from a single modern dashboard.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                Register organization <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Login to your workspace</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/customer-login">I'm a customer — book nearby</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span className="rounded-full border border-border px-3 py-1">{s}</span>
                {i < STEPS.length - 1 && <ArrowRight className="size-3" />}
              </span>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="font-display text-3xl tracking-tight">One platform, every module</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Switch on only what you need during onboarding — everything else stays a click away in your dashboard.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, label, text }) => (
                <article key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <Icon className="size-5 text-primary" />
                  <h3 className="mt-3 text-sm font-semibold">{label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
            <h2 className="font-display text-3xl tracking-tight">Ready in under five minutes</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Only the essentials are mandatory: account, verification, organization, opening hours and one service.
              Everything else can be skipped and finished later from your setup checklist.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/register">
                Start onboarding <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Luxe Salon CRM · Demo UI, no live backend.
        </div>
      </footer>
    </div>
  );
}
