import { Link, useRouterState } from "@tanstack/react-router";
import { crmNav } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function CrmSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">CRM</p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
        {crmNav.map((item) => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                active ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
