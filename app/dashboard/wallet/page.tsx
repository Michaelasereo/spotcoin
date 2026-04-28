"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";

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
    <section className="pb-10">
      <PageHeader title="My Wallet" description="Coins, tokens and history" />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-border bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            Coins to Give
          </p>
          <p className="mt-2 font-mono text-[40px] font-bold leading-none tracking-tight text-foreground">
            {coinsToGive}
          </p>
          <p className="mt-2 text-[11px] text-muted">Resets 1st of month</p>
        </div>

        <div className="rounded-[20px] border border-border bg-card p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            Spot Tokens
          </p>
          <p className="mt-2 font-mono text-[40px] font-bold leading-none tracking-tight text-accent">
            {spotTokensEarned}
          </p>
          <p className="mt-2 text-[11px] text-muted">≈ {formatNaira(projectedValue)}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            History
          </h2>
          {history.length > 0 ? (
            <span className="text-[11px] text-muted">{history.length} entries</span>
          ) : null}
        </div>

        <div className="mb-3">
          <Segmented
            items={[
              { id: "all", label: "All" },
              { id: "received", label: "Received" },
              { id: "sent", label: "Sent" },
            ]}
            value={activeFilter}
            onChange={(next) => setActiveFilter(next as FilterTab)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[16px] border border-border bg-card p-4"
              >
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No recognition history yet."
            description="Send or receive your first Spotcoin to fill this in."
          />
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
                <ListRow
                  key={item.id}
                  left={
                    <span
                      className={
                        isReceived
                          ? "flex h-9 w-9 items-center justify-center rounded-[10px] border border-accent/30 bg-accent/10 text-accent"
                          : "flex h-9 w-9 items-center justify-center rounded-[10px] border border-border bg-card-2 text-muted"
                      }
                    >
                      {isReceived ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                  }
                  title={description}
                  description={toDateLabel(item.createdAt)}
                  right={
                    <Badge variant={isReceived ? "accent" : "neutral"} className="font-mono">
                      {amountText}
                    </Badge>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
