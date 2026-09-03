import { createFileRoute, Link } from "@tanstack/react-router";
import { Contact, CreditCard, Gift, Megaphone, MessageSquareHeart, Users } from "lucide-react";
import { CrmSubnav } from "@/components/CrmSubnav";
import { crmNav } from "@/lib/crm";

const title = "CRM — Luxe Salon CRM";
const description = "Customer relationship hub: profiles, memberships, loyalty, campaigns and feedback.";

export const Route = createFileRoute("/crm")({
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

const ICONS = {
  Contact,
  Users,
  CreditCard,
  Gift,
  Megaphone,
  MessageSquareHeart,
} as const;

const COPY: Record<string, string> = {
  "/crm": "This hub. Jump into any CRM module below.",
  "/customers": "Profiles, wallet, membership and products used.",
  "/memberships": "Plans, enrollments and usage history.",
  "/loyalty": "Earn/redeem rules and the point ledger.",
  "/campaigns": "WhatsApp segments, templates and send status.",
  "/feedback": "Ratings, NPS and service recovery.",
};

function Page() {
  return (
    <div className="space-y-6">
      <CrmSubnav />
      <header>
        <h1 className="font-display text-2xl font-semibold">CRM</h1>
        <p className="text-sm text-muted-foreground">
          Customer is the master record. Memberships and loyalty belong to the customer. Campaigns message those
          customers. Feedback closes the loop.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {crmNav
          .filter((item) => item.to !== "/crm")
          .map((item) => {
            const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Users;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary hover:bg-accent"
              >
                <Icon className="size-5 text-primary" />
                <p className="mt-3 font-medium">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{COPY[item.to]}</p>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
