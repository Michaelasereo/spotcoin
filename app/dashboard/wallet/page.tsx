"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft } from "lucide-react";

type MeResponse = {
  data: {
    id: string;
    coinsToGive: number;
    spotTokensEarned: number;
    workspace: {
      name: string;
      tokenValueNaira: number;
    };
  };
};

type RecognitionItem = {
  id: string;
  senderId: string;
  recipientId: string;
  sender: { name: string };
  recipient: { name: string };
  value: { name: string };
  coinAmount: number;
  createdAt: string;
};

type RecognitionHistoryResponse = {
  data: RecognitionItem[];
};

type FilterTab = "all" | "received" | "sent";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

function toDateLabel(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function WalletPage() {
  const [coinsToGive, setCoinsToGive] = useState(0);
  const [spotTokensEarned, setSpotTokensEarned] = useState(0);
  const [tokenValueNaira, setTokenValueNaira] = useState(1000);
  const [history, setHistory] = useState<RecognitionItem[]>([]);
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, historyRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/users/me/recognitions?page=1&pageSize=50", { cache: "no-store" }),
        ]);

        const meJson = (await meRes.json()) as MeResponse;
        const historyJson = (await historyRes.json()) as RecognitionHistoryResponse;

        setCoinsToGive(meJson.data?.coinsToGive ?? 0);
        setSpotTokensEarned(meJson.data?.spotTokensEarned ?? 0);
        setUserId(meJson.data?.id ?? "");
        setTokenValueNaira(meJson.data?.workspace?.tokenValueNaira ?? 1000);
        setHistory(historyJson.data ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const projectedValue = spotTokensEarned * tokenValueNaira;

  const filteredHistory = useMemo(() => {
    if (!userId) return history;
    if (activeFilter === "sent") {
      return history.filter((item) => item.senderId === userId);
    }
    if (activeFilter === "received") {
      return history.filter((item) => item.recipientId === userId);
    }
    return history;
  }, [activeFilter, history, userId]);

  return (
    <section className="px-5 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link href="/dashboard" aria-label="Back to dashboard">
          <ChevronLeft size={20} className="text-[--text-primary]" />
        </Link>
        <h1 className="text-lg font-semibold text-[--text-primary]">My Wallet</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">
            Coins to Give
          </p>
          <p className="mt-1 font-mono text-4xl font-bold text-[--text-primary]">{coinsToGive}</p>
          <p className="mt-1 text-xs text-[--text-tertiary]">Resets 1st of month</p>
        </div>

        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">
            Spot Tokens Earned
          </p>
          <p className="mt-1 font-mono text-4xl font-bold text-[--accent]">{spotTokensEarned}</p>
          <p className="mt-1 text-xs text-[--text-secondary]">≈ {formatNaira(projectedValue)} at year-end</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">History</p>

        <div className="mb-3 flex rounded-full border border-[--border] bg-[--bg-card] p-1">
          {[
            { id: "all", label: "All" },
            { id: "received", label: "Received" },
            { id: "sent", label: "Sent" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as FilterTab)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                activeFilter === tab.id
                  ? "bg-[--bg-overlay] text-[--text-primary]"
                  : "text-[--text-secondary]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-[--border] bg-[--bg-card] p-4"
              >
                <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
                <div className="mt-2 h-3 w-24 rounded bg-[--bg-card-2]" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-[--text-secondary]">No recognition history yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((item) => {
              const isReceived = userId ? item.recipientId === userId : false;
              const isSent = userId ? item.senderId === userId : false;
              const amountText = isReceived ? `+${item.coinAmount}` : `-${item.coinAmount}`;
              const description = isReceived
                ? `From ${item.sender.name} · ${item.value.name}`
                : isSent
                  ? `To ${item.recipient.name} · ${item.value.name}`
                  : `${item.sender.name} → ${item.recipient.name} · ${item.value.name}`;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isReceived ? (
                        <ArrowDownLeft size={16} className="text-[--accent]" />
                      ) : (
                        <ArrowUpRight size={16} className="text-[--text-secondary]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-[--text-primary]">{description}</p>
                      <p className="mt-0.5 text-xs text-[--text-tertiary]">{toDateLabel(item.createdAt)}</p>
                    </div>
                  </div>
                  <p
                    className={`font-mono text-sm font-semibold ${
                      isReceived ? "text-[--accent]" : "text-[--text-secondary]"
                    }`}
                  >
                    {amountText}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
