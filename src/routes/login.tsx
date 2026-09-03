import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

const title = "Sign in — Luxe Salon CRM";
const description = "One sign-in for everyone: customers book appointments, salon teams manage their organization workspace.";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LoginPage,
});

const ROLES: { role: Role; hint: string }[] = [
  { role: "ADMIN", hint: "Full control of your organization" },
  { role: "STAFF", hint: "Only permitted modules" },
  { role: "STYLIST", hint: "Schedule, appointments & clients" },
  { role: "SUPER_ADMIN", hint: "Platform console for all organizations" },
];

function LoginPage() {
  const { signIn } = useAuth();
  const { signIn: signInCustomer } = useCustomerSession();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");
  const [showDemo, setShowDemo] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return void toast.error("Enter your email or mobile number");
    if (password.length < 4) return void toast.error("Enter your password");

    const account = findAccount(id);

    if (account?.type === "customer") {
      signInCustomer(account.name, account.phone ?? id);
      toast.success(`Welcome back, ${account.name}`);
      return void navigate({ to: "/nearby" });
    }

    if (account?.type === "organization") {
      const r = account.role ?? "ADMIN";
      signIn(account.email ?? id, r);
      toast.success(`Signed in as ${r}`);
      return void navigate({ to: r === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
    }

    // No stored account — infer from the identifier (demo behaviour).
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
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-xl">Luxe Salon</span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="font-display text-2xl tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One login for customers and salon teams — we take you to the right place automatically.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wide text-muted-foreground uppercase">Email or mobile number</Label>
              <Input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@business.com or 98765 43210"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs tracking-wide text-muted-foreground uppercase">Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setShowDemo((s) => !s)}
            className="mt-4 text-xs text-muted-foreground hover:text-foreground"
          >
            {showDemo ? "Hide" : "Show"} demo role options
          </button>
          {showDemo && (
            <div className="mt-3 grid gap-2">
              <p className="text-xs text-muted-foreground">
                Signing in with an email that has no account yet? Pick the workspace role to preview.
              </p>
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    role === r.role ? "border-primary bg-primary/5" : "border-border hover:bg-accent",
                  )}
                >
                  <span className="font-medium">{r.role}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </button>
              ))}
            </div>
          )}

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
