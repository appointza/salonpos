import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const items = [
  { to: "/users", label: "Users" },
  { to: "/roles", label: "Roles & permissions" },
] as const;

export function UsersRolesSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">Access</p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 w-fit">
        {items.map((item) => {
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
