import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/hooks/useAuth";
import { useCustomerSession } from "@/lib/customer";
import { findAccount, normalizeIdentifier, saveAccount } from "@/lib/accounts";
import { userService } from "@/services/user.service";

export function LoginPage() {
  const { signIn } = useAuth();
  const { signIn: signInCustomer } = useCustomerSession();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return void toast.error("Enter email or mobile number");
    if (password.length < 4) return void toast.error("Enter your password");

    if (id.includes("@")) {
      setSubmitting(true);
      try {
        const res = await userService.login({ email: id, password });
        const apiRole = (res.role?.toUpperCase().replace(/\s+/g, "_") || "ADMIN") as Role;
        signIn(res.email, apiRole, {
          id: res.userId,
          name: res.name,
          orgId: res.organizationId,
          locationId: res.locationId,
        });
        toast.success(`Signed in as ${res.name}`, { description: res.organizationName });
        navigate({ to: apiRole === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
      } catch {
        toast.error("Invalid email or password");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const account = findAccount(id);

    if (account?.type === "customer") {
      signInCustomer(account.name, account.phone ?? id);
      toast.success(`Welcome back, ${account.name}`);
      return void navigate({ to: "/nearby" });
    }

    if (!id.includes("@")) {
      const phone = normalizeIdentifier(id);
      const name = `Guest ${phone.slice(-4)}`;
      saveAccount({ identifier: phone, type: "customer", name, phone: id });
      signInCustomer(name, id);
      toast.success("Signed in", { description: "Browse salons near you and book directly." });
      return void navigate({ to: "/nearby" });
    }

    toast.error("Enter a valid email address for workspace login");
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
            Workspace users: sign in with your business email. Customers can use mobile number.
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
                autoComplete="username"
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
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

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
