import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Row } from "@/lib/store";

export function DashStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
        <Icon className="size-4 text-primary" />
      </div>
      <p className="font-display mt-3 text-3xl tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function DashHeader({
  kicker,
  title,
  subtitle,
  extra,
  actions,
}: {
  kicker: string;
  title: string;
  subtitle: ReactNode;
  extra?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{kicker}</p>
        <h1 className="font-display mt-1 text-4xl font-semibold tracking-tight">{title}</h1>
        <div className="mt-2 text-sm text-muted-foreground">{subtitle}</div>
        {extra}
      </div>
      {actions}
    </header>
  );
}

export function QuickLink({
  to,
  icon: Icon,
  color,
  title,
  text,
  badge,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  text: string;
  badge?: string;
}) {
  return (
    <Link to={to} className="relative rounded-xl border border-border p-4 transition-colors hover:bg-accent">
      {badge ? (
        <Badge variant="secondary" className="absolute top-3 right-3 text-[10px]">
          {badge}
        </Badge>
      ) : null}
      <span className={`inline-flex size-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
    </Link>
  );
}

export function sortAppointments(rows: Row[]) {
  return [...rows].sort((a, b) => {
    const da = `${String(a["date"] ?? "")} ${String(a["time"] ?? "")}`;
    const db = `${String(b["date"] ?? "")} ${String(b["time"] ?? "")}`;
    return da.localeCompare(db);
  });
}
