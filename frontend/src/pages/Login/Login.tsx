import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth, type Role } from "@/lib/auth";
import { useCustomerSession } from "@/lib/customer";
import { findAccount, normalizeIdentifier, saveAccount } from "@/lib/accounts";
import { DEMO_ROLE_GROUPS, type DemoUser } from "@/lib/demo-users";

const title = "Sign in — Luxe Salon CRM";
const description = "Choose a demo user to fill the form, then sign in.";

export function LoginPage() {
  const { signIn } = useAuth();
  const { signIn: signInCustomer } = useCustomerSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DemoUser | null>(null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");

  function fillUser(user: DemoUser) {
    setSelected(user);
    setIdentifier(user.kind === "customer" ? (user.phone ?? user.email) : user.email);
    setPassword(user.password);
    if (user.kind === "workspace") setRole(user.role);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return void toast.error("Choose a user or enter email / mobile");
    if (password.length < 4) return void toast.error("Enter the password");

    const demo =
      selected &&
      (identifier === selected.email || identifier === (selected.phone ?? "") || identifier === selected.name)
        ? selected
        : DEMO_ROLE_GROUPS.flatMap((g) => g.users).find(
            (u) => u.email === id || u.phone === id || normalizeIdentifier(u.phone ?? "") === normalizeIdentifier(id),
          );

    if (demo) {
      if (password !== demo.password) return void toast.error("Password does not match this demo user");
      if (demo.kind === "customer") {
        signInCustomer(demo.name, demo.phone ?? demo.email);
        toast.success(`Welcome back, ${demo.name}`);
        return void navigate({ to: "/nearby" });
      }
      signIn(demo.email, demo.role, {
        id: demo.id,
        name: demo.name,
        phone: demo.phone,
        orgId: demo.orgId,
      });
      toast.success(`Signed in as ${demo.name}`, { description: demo.role });
      return void navigate({ to: demo.role === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
    }

    const account = findAccount(id);

    if (account?.type === "customer") {
      signInCustomer(account.name, account.phone ?? id);
      toast.success(`Welcome back, ${account.name}`);
      return void navigate({ to: "/nearby" });
    }

    if (account?.type === "organization") {
      const r = account.role ?? "ADMIN";
      signIn(account.email ?? id, r, { name: account.name, phone: account.phone });
      toast.success(`Signed in as ${r}`);
      return void navigate({ to: r === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
    }

    if (!id.includes("@")) {
      const phone = normalizeIdentifier(id);
      const name = `Guest ${phone.slice(-4)}`;
      saveAccount({ identifier: phone, type: "customer", name, phone: id });
      signInCustomer(name, id);
      toast.success("Signed in", { description: "Browse salons near you and book directly." });
      return void navigate({ to: "/nearby" });
    }

    if (!/^\S+@\S+\.\S+$/.test(id)) return void toast.error("Enter a valid email address");
    signIn(id, role);
    toast.success(`Signed in as ${role}`);
    navigate({ to: role === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl">Luxe Salon</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a user to load email and password, then press Sign in.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="login-id" className="text-xs tracking-wide text-muted-foreground uppercase">
                Email or mobile number
              </Label>
              <Input
                id="login-id"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@business.com or 98765 43210"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login-password" className="text-xs tracking-wide text-muted-foreground uppercase">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {selected?.kind === "workspace" && (
              <p className="text-xs text-muted-foreground">
                Role: <strong>{selected.role}</strong> · {selected.title}
              </p>
            )}
            {selected?.kind === "customer" && (
              <p className="text-xs text-muted-foreground">
                Customer login · {selected.name}
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <div className="mt-8 space-y-5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Demo users</p>
            {DEMO_ROLE_GROUPS.map((group) => (
              <section key={group.label}>
                <p className="text-xs font-medium text-foreground">{group.label}</p>
                <p className="mb-2 text-xs text-muted-foreground">{group.hint}</p>
                <div className="grid gap-2">
                  {group.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => fillUser(user)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-accent",
                        selected?.id === user.id ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <span className="font-medium">{user.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{user.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {user.kind === "customer" ? user.phone : user.email}
                        {user.outlet ? ` · ${user.outlet}` : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
