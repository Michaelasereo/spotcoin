import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingLegalFooter } from "@/components/MarketingLegalFooter";
import { env } from "@/lib/env";
import { DEFAULT_SUPPORT_EMAIL } from "@/lib/supportContact";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Spotcoin sign-in, Slack, and workspace settings.",
};

export default function SupportPage() {
  const supportEmail = env.NEXT_PUBLIC_SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL;

  return (
    <div className="app-top-glow relative min-h-screen overflow-x-hidden bg-background">
      <MarketingHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-12 md:pt-16">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-foreground">Support</h1>
        <div className="space-y-6 text-[15px] leading-relaxed text-muted">
          <p>
            Spotcoin is typically managed by your organization. Start with your internal admin if you need
            access, payout questions, or Slack installation help.
          </p>

          <section className="rounded-[var(--radius-xl)] border border-border bg-card px-6 py-6">
            <h2 className="mb-3 text-lg font-semibold text-foreground">Contact</h2>
            <p>
              Email:{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
              >
                {supportEmail}
              </a>
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Common topics</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="font-medium text-foreground">Sign-in:</strong> use your work email and
                password on the{" "}
                <Link href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
                  Sign in
                </Link>{" "}
                page. Use{" "}
                <Link
                  href="/forgot-password"
                  className="text-foreground underline underline-offset-4 hover:no-underline"
                >
                  Forgot password
                </Link>{" "}
                if needed.
              </li>
              <li>
                <strong className="font-medium text-foreground">Slack:</strong> admins can install from{" "}
                <Link href="/slack" className="text-foreground underline underline-offset-4 hover:no-underline">
                  Spotcoin for Slack
                </Link>
                .
              </li>
              <li>
                <strong className="font-medium text-foreground">Privacy:</strong> see our{" "}
                <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:no-underline">
                  Privacy policy
                </Link>
                .
              </li>
            </ul>
          </section>
        </div>
      </main>

      <MarketingLegalFooter />
    </div>
  );
}
