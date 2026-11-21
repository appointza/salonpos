import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { BrandLockup } from "@/components/BrandLockup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type Role } from "@/hooks/useAuth";
import type { AuthIdentifyRes } from "@/model/auth";
import { useCustomerSession } from "@/pages/Login/customer-session";
import { normalizePhone } from "@/pages/Login/phone";
import { authService } from "@/services/auth.service";
import { LanguageSwitcher } from "@/i18n/LanguageSwitcher";
import { apiErrorMessage } from "@/utils/api-error";
import { cleanEmail, cleanIdentifier, cleanOtp, cleanPassword } from "@/utils/credentials";
import type { UserLoginRes } from "@/model/users";

type Step = "identify" | "verify";

export function ForgotPasswordPage() {
  const { signIn } = useAuth();
  const { signIn: signInCustomer } = useCustomerSession();
  const navigate = useNavigate();
  const search = useSearch({ from: "/forgot-password" });

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState(() => cleanIdentifier(search.identifier ?? ""));
  const [profile, setProfile] = useState<AuthIdentifyRes | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(next: AuthIdentifyRes, raw: string) {
    const cleanRaw = cleanIdentifier(raw);
    const res = await authService.sendOtp({
      identifier: cleanRaw,
      phone: next.phone || normalizePhone(cleanRaw),
      email: cleanEmail(next.email ?? ""),
    });
    setOtpHint(res.hint || (res.maskedEmail ? `Code sent to ${res.maskedEmail}` : "Check your email for the code."));
    toast.success("Verification code sent", {
      description: res.maskedEmail || res.maskedPhone || res.hint,
    });
  }

  async function startReset(e: React.FormEvent) {
    e.preventDefault();
    const raw = cleanIdentifier(identifier);
    if (!raw) return void toast.error("Enter your mobile number or business email");

    setBusy(true);
    try {
      const next = await authService.identify({ identifier: raw });
      setProfile(next);
      await sendCode(next, raw);
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      setStep("verify");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not start password reset"));
    } finally {
      setBusy(false);
    }
  }

  function finishOrgSession(res: UserLoginRes) {
    const apiRole = (res.role?.toUpperCase().replace(/\s+/g, "_") || "ADMIN") as Role;
    signIn(res.email, apiRole, {
      id: res.userId,
      name: res.name,
      phone: profile?.phone,
      orgId: Number(res.orgId || res.organizationId) || 0,
      locationId: res.locationId,
      language: res.language,
    });
    toast.success(`Password updated. Signed in as ${res.name}`);
    navigate({ to: apiRole === "SUPER_ADMIN" ? "/platform" : "/dashboard" });
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    const code = cleanOtp(otp);
    const pwd = cleanPassword(password);
    const confirmPwd = cleanPassword(confirmPassword);
    if (code.length < 6) return void toast.error("Enter the 6-digit code");
    if (pwd.length < 6) return void toast.error("Password must be at least 6 characters");
    if (pwd !== confirmPwd) return void toast.error("Passwords do not match");

    setBusy(true);
    try {
      const cleanId = cleanIdentifier(identifier);
      const phone = profile?.phone || normalizePhone(cleanId);
      const email = cleanEmail(profile?.email || (cleanId.includes("@") ? cleanId : ""));
      if (profile?.accountType === "organization") {
        const res = await authService.resetOrganizationPassword({
          phone,
          email,
          otp: code,
          password: pwd,
        });
        finishOrgSession(res);
        return;
      }
      const res = await authService.setupCustomerPassword({
        phone,
        otp: code,
        password: pwd,
        name: profile?.name?.trim() || "",
      });
      signInCustomer(res.name || "Customer", phone, res.userId);
      toast.success(`Password updated. Welcome, ${res.name || "guest"}`);
      navigate({ to: "/nearby" });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not reset password"));
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-3 py-8 sm:px-4 sm:py-12">
      <div className="w-full max-w-lg">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        <BrandLockup className="mb-8 justify-center" />

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {step === "identify" ? (
            <>
              <h1 className="font-display text-2xl tracking-tight">Forgot password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter the mobile or business email on your account. We email a verification code, then you set a new
                password.
              </p>
              <form className="mt-6 space-y-4" onSubmit={startReset}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-id">Mobile number or business email</Label>
                  <Input
                    id="reset-id"
                    value={identifier}
                    onChange={(e) => setIdentifier(cleanIdentifier(e.target.value))}
                    placeholder="98765 43210 or you@salon.com"
                    autoComplete="username"
                    inputMode="email"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending…" : "Send verification code"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep("identify")}
                className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Use a different login
              </button>
              <h1 className="font-display text-2xl tracking-tight">Verify &amp; set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">{otpHint}</p>
              <form className="mt-6 space-y-4" onSubmit={submitNewPassword}>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-otp">Verification code</Label>
                  <Input
                    id="reset-otp"
                    value={otp}
                    onChange={(e) => setOtp(cleanOtp(e.target.value))}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-password">New password</Label>
                  <Input
                    id="reset-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(cleanPassword(e.target.value))}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reset-confirm">Confirm password</Label>
                  <Input
                    id="reset-confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(cleanPassword(e.target.value))}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Saving…" : "Reset password & sign in"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy || !profile}
                  onClick={async () => {
                    if (!profile) return;
                    setBusy(true);
                    try {
                      await sendCode(profile, cleanIdentifier(identifier));
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
            <span className="mx-2">·</span>
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <span className="mx-2">·</span>
            <Link to="/child-safety" className="hover:text-foreground hover:underline">
              Child safety
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
