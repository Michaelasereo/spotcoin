"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BarChart2, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { AppToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type Period = "this_month" | "last_month" | "ytd";
type LeaderboardTab = "senders" | "receivers";

type AnalyticsPayload = {
  summary: {
    totalRecognitions: number;
    totalCoinsGiven: number;
    activeUsers: number;
    avgPerUser: number;
  };
  leaderboard: {
    topSenders: Array<{ userId: string; name: string; count: number }>;
    topReceivers: Array<{ userId: string; name: string; count: number }>;
  };
  valueCounts: Array<{ valueId: string; name: string; emoji: string; count: number }>;
  disengaged: Array<{
    id: string;
    name: string;
    email: string;
    lastActiveAt: string | null;
  }>;
};

const periodLabels: Record<Period, string> = {
  this_month: "This month",
  last_month: "Last month",
  ytd: "Year",
};

function formatLastActive(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("this_month");
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>("senders");
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNudging, setIsNudging] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/analytics?period=${period}`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: AnalyticsPayload; error?: string };
        if (!response.ok || !payload.data) {
          showToast(payload.error ?? "Failed to load analytics", "error");
          return;
        }
        setData(payload.data);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [period]);

  const leaderboardRows = useMemo(() => {
    if (!data) return [];
    return leaderboardTab === "senders" ? data.leaderboard.topSenders : data.leaderboard.topReceivers;
  }, [data, leaderboardTab]);

  const maxValueCount = useMemo(
    () => Math.max(1, ...(data?.valueCounts.map((item) => item.count) ?? [1])),
    [data],
  );

  const handleNudge = async (userId: string) => {
    setIsNudging(userId);
    try {
      const response = await fetch("/api/admin/analytics/nudge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Could not send nudge", "error");
        return;
      }
      showToast("Nudge sent");
    } finally {
      setIsNudging(null);
    }
  };

  return (
    <section className="pb-10">
      <header className="py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="mt-1 text-xs text-muted">Track recognition health across your team.</p>
      </header>

      <div className="mb-6">
        <Segmented
          items={(Object.keys(periodLabels) as Period[]).map((periodKey) => ({
            id: periodKey,
            label: periodLabels[periodKey],
          }))}
          value={period}
          onChange={(next) => setPeriod(next as Period)}
        />
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[20px] border border-border bg-card p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Recognitions", value: data.summary.totalRecognitions, icon: Sparkles },
              { label: "Coins given", value: data.summary.totalCoinsGiven, icon: BarChart2 },
              { label: "Active people", value: data.summary.activeUsers, icon: TrendingUp },
              { label: "Avg per person", value: data.summary.avgPerUser, icon: Award },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-[20px] border border-border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                      {item.label}
                    </p>
                    <Icon size={14} className="text-muted" />
                  </div>
                  <p className="mt-2 font-mono text-[28px] font-bold leading-none text-foreground">
                    {item.value}
                  </p>
                </div>
              );
            })}
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                Leaderboard
              </h2>
              <div className="w-44">
                <Segmented
                  items={[
                    { id: "senders", label: "Senders" },
                    { id: "receivers", label: "Receivers" },
                  ]}
                  value={leaderboardTab}
                  onChange={(next) => setLeaderboardTab(next as LeaderboardTab)}
                />
              </div>
            </div>

            {leaderboardRows.length === 0 ? (
              <EmptyState title="No data for this period yet." />
            ) : (
              <ul className="overflow-hidden rounded-[16px] border border-border bg-card">
                {leaderboardRows.map((row, index) => {
                  const isPodium = index < 3;
                  return (
                    <li
                      key={row.userId}
                      className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                    >
                      <span
                        className={
                          isPodium
                            ? "flex h-7 w-7 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-mono text-xs font-semibold text-accent"
                            : "flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card-2 font-mono text-xs text-muted"
                        }
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 truncate text-sm text-foreground">{row.name}</span>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {row.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              By value
            </h2>
            {data.valueCounts.length === 0 ? (
              <EmptyState title="No values used yet." />
            ) : (
              <div className="space-y-2">
                {data.valueCounts.map((item) => (
                  <div
                    key={item.valueId}
                    className="rounded-[16px] border border-border bg-card px-4 py-3.5"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-foreground">
                        <span className="text-base">{item.emoji}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="font-mono text-xs text-muted">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-card-2">
                      <div
                        className="h-full rounded-full bg-foreground/80 transition-[width]"
                        style={{ width: `${(item.count / maxValueCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-warning">
              <TrendingDown size={12} />
              Needs attention
            </h2>
            {data.disengaged.length === 0 ? (
              <EmptyState title="Everyone's active." description="No disengaged teammates this period." />
            ) : (
              <div className="space-y-2">
                {data.disengaged.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-card px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-[11px] text-muted">
                        Last active {formatLastActive(user.lastActiveAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => void handleNudge(user.id)}
                      disabled={isNudging === user.id}
                      variant="outline"
                      size="sm"
                    >
                      {isNudging === user.id ? "Sending..." : "Nudge"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <AppToast toast={toast} />
    </section>
  );
}
