import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Coins, HeartHandshake, LineChart } from "lucide-react";

import { MarketingHeader } from "@/components/MarketingHeader";
import { MarketingLegalFooter } from "@/components/MarketingLegalFooter";
import { IconBox } from "@/components/ui/icon-box";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <div className="app-top-glow relative min-h-screen overflow-x-hidden bg-background">
      <MarketingHeader />

      <main className="relative z-10">
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 md:pt-24">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-muted">
            Peer recognition
          </p>
          <h1 className="mb-5 text-center text-4xl font-bold tracking-tight text-foreground md:text-5xl md:leading-[1.1]">
            Recognize great work.
            <br />
            <span className="text-muted">Grow culture.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-center text-[15px] leading-relaxed text-muted md:text-base">
            Spotcoin helps teams send monthly recognition, earn Spot Tokens toward payouts, and keep
            feedback visible—without leaving your workspace rituals behind.
          </p>
          <div className="flex justify-center">
            <Button size="lg" className="min-w-[200px]" asChild>
              <Link href="/login">
                Sign in to Spotcoin
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-nav py-16 md:py-20">
          <div className="mx-auto max-w-5xl px-5">
            <h2 className="mb-10 text-center text-lg font-semibold text-foreground md:text-xl">
              Built for how you already work
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <FeatureCard
                icon={HeartHandshake}
                title="Send recognition"
                description="Use your monthly budget to recognize teammates with a clear message—balances update instantly."
              />
              <FeatureCard
                icon={Coins}
                title="Spot Tokens add up"
                description="Received recognition tracks as Spot Tokens for year-end payout visibility—separate from what you can send."
              />
              <FeatureCard
                icon={LineChart}
                title="Admins stay in control"
                description="Workspace settings, users, analytics, and payouts in one place when you need oversight."
              />
            </div>
          </div>
        </section>

        <div className="border-t border-border py-6">
          <p className="text-center text-xs text-muted">Spotcoin · Internal recognition</p>
        </div>
        <MarketingLegalFooter />
      </main>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 md:rounded-[var(--radius-xl)]">
      <IconBox icon={icon} className="mb-4" />
      <h3 className="mb-2 text-[15px] font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
