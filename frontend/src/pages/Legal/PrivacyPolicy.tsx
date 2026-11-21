import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { BRAND_LOGO } from "@/brand";

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={BRAND_LOGO} alt="Kriosapp" width={32} height={32} className="size-8 object-contain" />
            <span className="font-display text-lg">Kriosapp</span>
          </Link>
          <Link to="/child-safety" className="text-sm text-muted-foreground hover:text-foreground">
            Child safety
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Legal</p>
        <h1 className="mt-1 font-display text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 29 October 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <p>
            Kriosapp (“Krios”, “we”) is salon and spa software: workspace tools for salons (POS, bookings, staff,
            invoices, loyalty) and a guest app for nearby salons, offers, and appointments. This policy explains what we
            collect, why, and how you can delete your account.
          </p>

          <section>
            <h2 className="font-display text-lg">Who this covers</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Salon staff and owners who sign in to the workspace</li>
              <li>Guests and customers who book, play rewards, or sign in with a mobile number</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Account details: name, mobile number, email, password (stored as a hash), language</li>
              <li>Salon business data you enter: outlets, services, bills, GST details, staff, inventory</li>
              <li>Customer visit data: appointments, invoices, loyalty points, feedback, WhatsApp messages you send</li>
              <li>Device and usage data needed to run the app (for example sign-in session on this device)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg">How we use it</h2>
            <p className="mt-2 text-muted-foreground">
              We use this information to operate the product: sign-in, bookings, billing, GST invoices, loyalty, and
              messages you choose to send (such as WhatsApp receipts). We do not sell personal data. Salon owners see
              guest data that belongs to their outlet so they can serve that guest.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Sharing</h2>
            <p className="mt-2 text-muted-foreground">
              We share data only with processors that host the app (for example the database and, if you connect them,
              WhatsApp Business / Google Maps). We may disclose information if required by law.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Delete your account</h2>
            <p className="mt-2 text-muted-foreground">
              You can delete your own account in the app: salon users under <strong>Settings → Privacy &amp; account</strong>
              ; guests under the nearby menu. That deactivates sign-in and removes or anonymises your profile (name,
              phone, email, password). Invoice and appointment history a salon is required to keep may remain as business
              records with personal fields cleared where possible.
            </p>
            <p className="mt-2 text-muted-foreground">
              A salon owner can also deactivate a staff user from <strong>Users</strong>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Child safety</h2>
            <p className="mt-2 text-muted-foreground">
              We prohibit child sexual abuse and exploitation. How to report, how we review, and our safety contact are
              on the{" "}
              <Link to="/child-safety" className="text-primary underline-offset-4 hover:underline">
                Child Safety Standards
              </Link>{" "}
              page.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about privacy or deletion:{" "}
              <a className="text-primary underline-offset-4 hover:underline" href="mailto:hello@kriosapp.com">
                hello@kriosapp.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3.5" /> Kriosapp
          </span>
          <span className="flex gap-4">
            <Link to="/child-safety" className="hover:text-foreground">
              Child safety
            </Link>
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
