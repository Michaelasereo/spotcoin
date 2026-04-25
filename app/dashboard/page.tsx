import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BarChart2, Heart, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function formatHeroDate(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      coinsToGive: true,
      spotTokensEarned: true,
      workspace: {
        select: {
          tokenValueNaira: true,
          name: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  const firstName = user.name.split(" ")[0] || user.name;
  const projectedValue = user.spotTokensEarned * user.workspace.tokenValueNaira;
  const today = new Date();
  const monthName = today.toLocaleString("en-US", { month: "long" });

  const featureCards = [
    {
      href: "/dashboard/feed",
      title: "Feed",
      subtitle: "See all recognitions",
      icon: Activity,
    },
    {
      href: "/dashboard/recognise",
      title: "Recognise",
      subtitle: "Send a Spotcoin",
      icon: Heart,
    },
    {
      href: "/dashboard/wallet",
      title: "My Wallet",
      subtitle: "Tokens and history",
      icon: Wallet,
    },
    {
      href: "/admin/analytics",
      title: "Leaderboard",
      subtitle: "Top this month",
      icon: BarChart2,
    },
  ];

  return (
    <section className="px-5 pb-8">
      <div className="flex items-center justify-center border-b border-[--border] px-5 py-4">
        <span className="text-sm font-medium text-[--text-primary]">Spotcoin</span>
      </div>

      <div className="mt-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">
          LAGOS · {formatHeroDate(today)}
        </p>
        <h1 className="mt-2 text-[34px] font-bold leading-tight text-[--text-primary]">
          Hey {firstName}.
        </h1>
        <p className="text-[34px] font-bold leading-tight text-[--text-secondary]">
          Recognise. Reward. Repeat.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {user.coinsToGive > 0 ? (
            <span className="rounded-full border border-[--accent-border] bg-[--accent-bg] px-2.5 py-1 text-xs font-medium text-[--accent]">
              🪙 {user.coinsToGive} coins to give
            </span>
          ) : null}
          <span className="rounded-full border border-[--accent-border] bg-[--accent-bg] px-2.5 py-1 text-xs font-medium text-[--accent]">
            {monthName} active
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[--border] bg-[--bg-card] p-4">
        <p className="mb-3 text-xs text-[--text-secondary]">{user.workspace.name}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em] text-[--text-secondary]">
              Coins to Give
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-[--text-primary]">
              {user.coinsToGive}
            </p>
            <p className="mt-1 text-xs text-[--text-tertiary]">resets 1st of month</p>
          </div>

          <div className="border-l border-[--border] pl-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[--text-secondary]">
              Spot Tokens
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-[--text-primary]">
              {user.spotTokensEarned}
            </p>
            <p className="mt-1 text-xs text-[--accent]">
              ≈ {formatNaira(projectedValue)} at year-end
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex w-full flex-col gap-8 rounded-2xl border border-[--border] bg-[--bg-card] p-4 text-left transition-opacity active:opacity-70"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[--bg-card-2]">
                <Icon size={18} className="text-[--text-secondary]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[--text-primary]">{card.title}</p>
                <p className="mt-0.5 text-xs text-[--text-secondary]">{card.subtitle}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {user.coinsToGive === 0 ? (
        <div className="mt-4 rounded-2xl border border-[--border-mid] bg-[--bg-card] p-4">
          <p className="text-sm font-semibold text-[--text-primary]">Your coins are currently empty</p>
          <p className="mt-1 text-sm text-[--text-secondary]">
            Your coins refill on the 1st. Check back soon.
          </p>
        </div>
      ) : null}
    </section>
  );
}
