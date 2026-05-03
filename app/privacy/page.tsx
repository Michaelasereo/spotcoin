import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingLegalFooter } from "@/components/MarketingLegalFooter";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Spotcoin handles personal data, Slack integration, and retention.",
};

export default function PrivacyPage() {
  return (
    <div className="app-top-glow relative min-h-screen overflow-x-hidden bg-background">
      <MarketingHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-12 md:pt-16">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground">Privacy policy</h1>
        <div className="space-y-6 text-[15px] leading-relaxed text-muted">
          <p className="text-foreground">
            This policy describes how Spotcoin (“we”) processes information when your employer uses Spotcoin
            for peer recognition and related payouts.
          </p>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">What we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-foreground">Account data:</strong> name, work email,
                role, and workspace membership provided by your organization.
              </li>
              <li>
                <strong className="font-medium text-foreground">Recognition content:</strong> messages you
                send or receive, linked company values, and amounts (Spot Tokens / coins) recorded in the
                product.
              </li>
              <li>
                <strong className="font-medium text-foreground">Slack identifiers:</strong> if Slack is
                connected, we store Slack team and user IDs needed to deliver messages and match users to
                Spotcoin accounts. We do not sell this data.
              </li>
              <li>
                <strong className="font-medium text-foreground">Technical data:</strong> standard logs and
                security signals needed to operate the service (for example IP addresses in server logs for
                abuse prevention).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">How we use data</h2>
            <p>
              We use the above to provide recognition, balances, analytics for authorized admins, Slack
              delivery, payouts your workspace configures, and to secure and improve the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Retention</h2>
            <p>
              Your organization controls how long recognition history must remain available for payroll or HR
              purposes. Contact your Spotcoin administrator for workspace-specific retention practices.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
            <p>
              For privacy questions, contact your workspace administrator or see{" "}
              <Link href="/support" className="text-foreground underline underline-offset-4 hover:no-underline">
                Support
              </Link>
              .
            </p>
          </section>

          <p className="text-xs text-muted">Last updated: May 2026</p>
        </div>
      </main>

      <MarketingLegalFooter />
    </div>
  );
}
