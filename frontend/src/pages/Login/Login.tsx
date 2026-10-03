import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Building2, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/hooks/useAuth";
import type { AuthIdentifyRes } from "@/model/auth";
import { useCustomerSession } from "@/pages/Login/customer-session";
import { normalizePhone } from "@/pages/Login/phone";
import { authService } from "@/services/auth.service";
import { apiErrorMessage } from "@/utils/api-error";

type Step = "identify" | "org-password" | "customer-password" | "customer-setup";

export function LoginPage() {
  const { signIn } = useAuth();
  const { signIn: signInCustomer } = useCustomerSession();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [profile, setProfile] = useState<AuthIdentifyRes | null>(null);
  const [otpHint, setOtpHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    const raw = identifier.trim();
    if (!raw) return void toast.error("Enter your mobile number or business email");

    setBusy(true);
    try {
      const res = await authService.identify({ identifier: raw });
      setProfile(res);

      if (res.accountType === "organization") {
        if (!res.hasPassword) {
          toast.error("This workspace account has no password yet. Contact your admin.");
          return;
        }
        setStep("org-password");
        return;
      }

      if (res.accountType === "customer") {
        setName(res.name || "");
        if (res.hasPassword) {
          setStep("customer-password");
        } else {
          await sendOtp(res.phone || normalizePhone(raw));
          setStep("customer-setup");
        }
        return;
      }

      setName("");
      await sendOtp(normalizePhone(raw));
      setStep("customer-setup");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not look up this number"));
    } finally {
      setBusy(false);
    }
  }

  async function sendOtp(phone: string) {
    const res = await authService.sendOtp({ phone });
    setOtpHint(res.hint || "Demo OTP: 123456");
    toast.success("Verification code sent", { description: res.maskedPhone || maskHint(phone) });
  }

  function maskHint(phone: string) {
    const n = normalizePhone(phone);
    return n.length >= 4 ? `******${n.slice(-4)}` : phone;
  }

  async function loginOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.email) return void toast.error("Missing workspace email");
    if (password.length < 4) return void toast.error("Enter your password");

    setBusy(true);
    try {
      const res = await authService.loginOrganization({ email: profile.email, password });
      const apiRole = (res.role?.toUpperCase().replace(/\s+/g, "_") || "ADMIN") as Role;
      signIn(res.email, apiRole, {
        id: res.userId,
        name: res.name,
        phone: profile.phone,
        orgId: Number(res.orgId || res.organizationId) || 0,
        locationId: res.locationId,
      });
      toast.success(`Signed in as ${res.name}`, { description: res.organizationName });
      navigate({ to: apiRole === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Invalid email or password"));
      setBusy(false);
    }
  }

  async function loginCustomer(e: React.FormEvent) {
    e.preventDefault();
    const phone = profile?.phone || normalizePhone(identifier);
    if (password.length < 4) return void toast.error("Enter your password");

    setBusy(true);
    try {
      const res = await authService.loginCustomer({ phone, password });
      finishCustomerSession(res.name, phone, res.userId);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Invalid mobile or password"));
    } finally {
      setBusy(false);
    }
  }

  async function setupCustomerPassword(e: React.FormEvent) {
    e.preventDefault();
    const phone = profile?.phone || normalizePhone(identifier);
    if (otp.replace(/\D/g, "").length < 6) return void toast.error("Enter the 6-digit code");
    if (password.length < 6) return void toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return void toast.error("Passwords do not match");
    const displayName = name.trim() || profile?.name?.trim() || "Customer";

    setBusy(true);
    try {
      const res = await authService.setupCustomerPassword({
        phone,
        otp: otp.trim(),
        password,
        name: displayName,
      });
      finishCustomerSession(res.name || displayName, phone, res.userId);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not verify and create password"));
    } finally {
      setBusy(false);
    }
  }

  function finishCustomerSession(displayName: string, phone: string, userId?: number) {
    signInCustomer(displayName, phone, userId);
    toast.success(`Welcome, ${displayName}`);
    navigate({ to: "/nearby" });
  }

  function goBack() {
    setStep("identify");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
  }

  const isOrg = step === "org-password";
  const isCustomerPassword = step === "customer-password";
  const isCustomerSetup = step === "customer-setup";

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
          {step === "identify" ? (
            <>
              <h1 className="font-display text-2xl tracking-tight">Sign in</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your mobile number. We&apos;ll detect whether you&apos;re a salon team member or a customer.
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleIdentify}>
                <div className="space-y-1.5">
                  <Label htmlFor="login-id" className="text-xs tracking-wide text-muted-foreground uppercase">
                    Mobile number or business email
                  </Label>
                  <Input
                    id="login-id"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="98765 43210 or you@salon.com"
                    autoComplete="username"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Checking…" : "Continue"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Change number
              </button>

              {isOrg && (
                <>
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Salon workspace account</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.name ? `${profile.name} · ` : ""}
                        {profile?.email}
                      </p>
                    </div>
                  </div>
                  <h1 className="font-display text-2xl tracking-tight">Enter password</h1>
                  <form className="mt-6 space-y-4" onSubmit={loginOrganization}>
                    <div className="space-y-1.5">
                      <Label htmlFor="org-password">Password</Label>
                      <Input
                        id="org-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Signing in…" : "Sign in to workspace"}
                    </Button>
                  </form>
                </>
              )}

              {isCustomerPassword && (
                <>
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <UserRound className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">Customer account</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.name} · {profile?.maskedPhone || maskHint(profile?.phone || identifier)}
                      </p>
                    </div>
                  </div>
                  <h1 className="font-display text-2xl tracking-tight">Enter password</h1>
                  <form className="mt-6 space-y-4" onSubmit={loginCustomer}>
                    <div className="space-y-1.5">
                      <Label htmlFor="customer-password">Password</Label>
                      <Input
                        id="customer-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Signing in…" : "Sign in"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      disabled={busy}
                      onClick={async () => {
                        const phone = profile?.phone || normalizePhone(identifier);
                        setBusy(true);
                        try {
                          await sendOtp(phone);
                          setPassword("");
                          setStep("customer-setup");
                        } catch (err) {
                          toast.error(apiErrorMessage(err, "Could not send code"));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Forgot password? Verify with OTP
                    </Button>
                  </form>
                </>
              )}

              {isCustomerSetup && (
                <>
                  <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                    <UserRound className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">
                        {profile?.accountType === "unknown" ? "Create your account" : "Set up your password"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.name ? `${profile.name} · ` : ""}
                        {profile?.maskedPhone || maskHint(profile?.phone || identifier)}
                      </p>
                    </div>
                  </div>
                  <h1 className="font-display text-2xl tracking-tight">Verify &amp; create password</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We sent a code to your mobile. {otpHint || "Demo OTP: 123456"}
                  </p>
                  <form className="mt-6 space-y-4" onSubmit={setupCustomerPassword}>
                    {!profile?.name && (
                      <div className="space-y-1.5">
                        <Label htmlFor="setup-name">Your name</Label>
                        <Input
                          id="setup-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="setup-otp">Verification code</Label>
                      <Input
                        id="setup-otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="setup-password">New password</Label>
                      <Input
                        id="setup-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="setup-confirm">Confirm password</Label>
                      <Input
                        id="setup-confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy ? "Saving…" : "Create password & sign in"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={busy}
                      onClick={async () => {
                        const phone = profile?.phone || normalizePhone(identifier);
                        setBusy(true);
                        try {
                          await sendOtp(phone);
                        } catch (err) {
                          toast.error(apiErrorMessage(err, "Could not resend code"));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Resend code
                    </Button>
                  </form>
                </>
              )}
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New salon business?{" "}
            <Link to="/register" className="text-primary hover:underline">
              Register your organisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
