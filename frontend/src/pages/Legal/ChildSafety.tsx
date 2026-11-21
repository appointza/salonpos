import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { BRAND_LOGO, CHILD_SAFETY_EMAIL } from "@/brand";
import { ReportSafetyForm } from "@/pages/Legal/ReportSafetyForm";

export function ChildSafetyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={BRAND_LOGO} alt="Kriosapp" width={32} height={32} className="size-8 object-contain" />
            <span className="font-display text-lg">Kriosapp</span>
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Safety</p>
        <h1 className="mt-1 font-display text-3xl">Child Safety Standards</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 15 November 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-6 text-foreground">
          <p>
            Kriosapp (“Krios”) is salon and spa business software: point of sale, bookings, staff tools, and a guest
            app for nearby salons, offers, and appointments. It is not a social network, dating app, anonymous chat, or
            random matching product. This page is our public Child Safety Standards policy.
          </p>

          <section>
            <h2 className="font-display text-lg">Zero tolerance</h2>
            <p className="mt-2 text-muted-foreground">
              We have zero tolerance for child sexual abuse and exploitation (CSAE), including child sexual abuse
              material (CSAM). Anyone who uses Krios to create, share, solicit, or store CSAM, or to sexually exploit a
              minor, is prohibited. We will remove confirmed prohibited material from our systems, disable involved
              accounts, and report confirmed CSAM to the appropriate authorities.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">What is prohibited</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Child sexual abuse and exploitation, including CSAM in any form</li>
              <li>Grooming, sexual solicitation, or sexual exploitation of anyone under 18</li>
              <li>Sharing, requesting, or distributing CSAM or links to it</li>
              <li>Using salon profiles, photos, feedback, or messages to harm or exploit a child</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              Do not upload CSAM through this site or the app. Describe the issue and where it appeared so staff can
              review it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">How to report</h2>
            <p className="mt-2 text-muted-foreground">
              Use the form on this page, the in-app <strong>Report user or content</strong> action in Settings or the
              guest menu, or email{" "}
              <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${CHILD_SAFETY_EMAIL}`}>
                {CHILD_SAFETY_EMAIL}
              </a>
              . Include what you saw, when, and any user name, outlet, or URL. Reports are logged with a report ID and
              start as <strong>open</strong> for investigation. A report is not treated as confirmed abuse until a
              reviewer verifies it.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Review and removal</h2>
            <p className="mt-2 text-muted-foreground">
              Designated safety staff review open reports, preserve relevant records, and decide the action: no
              violation, content removal, account restriction or deletion, and whether to escalate to law enforcement.
              Confirmed CSAM is removed from Krios systems as quickly as we can. We keep investigation notes (status,
              action, resolution date) with the report.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Authorities</h2>
            <p className="mt-2 text-muted-foreground">
              Confirmed CSAM is reported to the competent authorities. In India that includes the National Cyber Crime
              Reporting Portal (
              <a className="text-primary underline-offset-4 hover:underline" href="https://cybercrime.gov.in">
                cybercrime.gov.in
              </a>
              ) and local law enforcement. We cooperate with lawful requests from police and child-protection agencies.
              Where NCMEC or another mandated hotline applies, we file there as required.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Child safety contact</h2>
            <p className="mt-2 text-muted-foreground">
              Designated contact for child safety concerns, Google Play notices, and law-enforcement coordination:{" "}
              <a className="text-primary underline-offset-4 hover:underline" href={`mailto:${CHILD_SAFETY_EMAIL}`}>
                {CHILD_SAFETY_EMAIL}
              </a>
              . This inbox is monitored by staff who can explain these procedures and act on reports.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg">Submit a report</h2>
            <p className="mt-2 mb-4 text-muted-foreground">
              Choose a reason, describe what you saw, and send. You will receive a report ID.
            </p>
            <ReportSafetyForm />
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3.5" /> Kriosapp
          </span>
          <span className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">
              Privacy
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
