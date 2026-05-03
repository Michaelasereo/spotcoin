import type { Metadata } from "next";
import Link from "next/link";

import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingLegalFooter } from "@/components/MarketingLegalFooter";

export const metadata: Metadata = {
  title: "Spotcoin for Slack",
  description:
    "Install Spotcoin for Slack to send recognition from your workspace and keep Spot Tokens in sync.",
};

export default function SlackAppLandingPage() {
  return (
    <div className="app-top-glow relative min-h-screen overflow-x-hidden bg-background">
      <MarketingHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-12 md:pt-16">
        <h1 className="mb-4 text-center text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Spotcoin for Slack
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-center text-[15px] leading-relaxed text-muted">
          Connect Slack so your team can send recognition from channels and home, while balances and
          Spot Tokens stay aligned with Spotcoin.
        </p>

        <section className="mb-12 rounded-[var(--radius-xl)] border border-border bg-card px-6 py-8 md:px-10">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Add to Slack</h2>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            You must be a Spotcoin <strong className="font-medium text-foreground">administrator</strong>{" "}
            for your organization. You will sign in (if needed), then continue to Slack to approve the app.
          </p>
          <div className="flex flex-col items-center gap-4 sm:items-start">
            <a href="/api/slack/oauth/start">
              {/* Official Slack “Add to Slack” asset per Slack API branding */}
              <img
                alt="Add to Slack"
                height={40}
                width={139}
                src="https://platform.slack-edge.com/img/add_to_slack.png"
                srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
              />
            </a>
            <p className="text-center text-xs text-muted sm:text-left">
              If you are not signed in, you will be asked to sign in first, then returned to connect Slack.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Install step-by-step</h2>
          <ol className="list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-muted">
            <li>
              Sign in to Spotcoin as an <strong className="font-medium text-foreground">admin</strong> (
              <Link href="/login" className="text-foreground underline underline-offset-4 hover:no-underline">
                Sign in
              </Link>
              ).
            </li>
            <li>
              Click <strong className="font-medium text-foreground">Add to Slack</strong> above (or open{" "}
              <strong className="font-medium text-foreground">Admin → Settings</strong> in Spotcoin and use{" "}
              <strong className="font-medium text-foreground">Connect Slack</strong>).
            </li>
            <li>
              In Slack, choose the workspace and approve the requested permissions. You will be redirected
              back to Spotcoin when installation completes.
            </li>
          </ol>
        </section>

        <section className="rounded-xl border border-border bg-nav px-6 py-6 text-sm leading-relaxed text-muted">
          <p className="mb-2 font-medium text-foreground">Slack data</p>
          <p>
            Spotcoin uses Slack to deliver recognition messages and optional notifications. We store Slack
            team and user identifiers needed to route messages. See our{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:no-underline">
              Privacy policy
            </Link>{" "}
            for details.
          </p>
        </section>
      </main>

      <MarketingLegalFooter />
    </div>
  );
}
