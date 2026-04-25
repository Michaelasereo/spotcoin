"use client";

import { useEffect, useMemo, useState } from "react";

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

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

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
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
    <section className="px-5 pb-8">
      <header className="py-4">
        <h1 className="text-lg font-semibold text-[--text-primary]">Analytics</h1>
      </header>

      <div className="mb-4 flex rounded-full border border-[--border] bg-[--bg-card] p-1">
        {(Object.keys(periodLabels) as Period[]).map((periodKey) => (
          <button
            key={periodKey}
            onClick={() => setPeriod(periodKey)}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              period === periodKey ? "bg-[--bg-overlay] text-[--text-primary]" : "text-[--text-secondary]"
            }`}
          >
            {periodLabels[periodKey]}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-[--border] bg-[--bg-card] p-4">
              <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
              <div className="mt-2 h-3 w-24 rounded bg-[--bg-card-2]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total recognitions", value: data.summary.totalRecognitions },
              { label: "Total coins given", value: data.summary.totalCoinsGiven },
              { label: "Active employees", value: data.summary.activeUsers },
              { label: "Avg per person", value: data.summary.avgPerUser },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
                <p className="text-[10px] uppercase tracking-[0.08em] text-[--text-secondary]">
                  {item.label}
                </p>
                <p className="mt-1 font-mono text-3xl font-bold text-[--text-primary]">{item.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex rounded-full border border-[--border] bg-[--bg-card] p-1">
              <button
                onClick={() => setLeaderboardTab("senders")}
                className={`flex-1 rounded-full py-2 text-sm font-medium ${
                  leaderboardTab === "senders"
                    ? "bg-[--bg-overlay] text-[--text-primary]"
                    : "text-[--text-secondary]"
                }`}
              >
                Top senders
              </button>
              <button
                onClick={() => setLeaderboardTab("receivers")}
                className={`flex-1 rounded-full py-2 text-sm font-medium ${
                  leaderboardTab === "receivers"
                    ? "bg-[--bg-overlay] text-[--text-primary]"
                    : "text-[--text-secondary]"
                }`}
              >
                Top receivers
              </button>
            </div>

            <div className="space-y-2">
              {leaderboardRows.map((row, index) => (
                <div
                  key={row.userId}
                  className={`flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3 ${
                    index < 3 ? "border-l-4 border-l-[--accent-border]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-xs font-mono text-[--text-tertiary]">{index + 1}</span>
                    <span className="text-sm text-[--text-primary]">{row.name}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold text-[--text-primary]">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">By value</p>
            <div className="space-y-2">
              {data.valueCounts.map((item) => (
                <div key={item.valueId} className="rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-[--text-primary]">
                      {item.emoji} {item.name}
                    </span>
                    <span className="font-mono text-[--text-secondary]">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[--bg-card-2]">
                    <div
                      className="h-2 rounded-full bg-[--text-primary]"
                      style={{ width: `${(item.count / maxValueCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--warning]">Needs attention</p>
            {data.disengaged.length === 0 ? (
              <div className="rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3 text-sm text-[--text-secondary]">
                Everyone&apos;s active 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {data.disengaged.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5"
                  >
                    <div>
                      <p className="text-sm text-[--text-primary]">{user.name}</p>
                      <p className="text-xs text-[--text-secondary]">
                        Last active {formatLastActive(user.lastActiveAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => void handleNudge(user.id)}
                      disabled={isNudging === user.id}
                      className="rounded-full border border-[--border-mid] px-4 py-2 text-sm text-[--text-primary] disabled:opacity-50"
                    >
                      {isNudging === user.id ? "Sending..." : "Nudge"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-40px)] max-w-lg -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-[--accent-border] bg-[--bg-overlay] text-[--text-primary]"
                : "border-[--error] bg-[--bg-overlay] text-[--text-primary]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </section>
  );
}
