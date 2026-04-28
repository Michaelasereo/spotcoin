"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Activity, ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

type FeedItem = {
  id: string;
  message: string;
  coinAmount: number;
  createdAt: string;
  sender: { name: string; avatarUrl: string | null };
  recipient: { name: string; avatarUrl: string | null };
  value: { name: string; emoji: string };
};

type FeedResponse = {
  data: FeedItem[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
};

function toTimeAgo(isoDate: string) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - then);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / minute));
    return `${mins}m ago`;
  }
  if (diffMs < day) {
    const hrs = Math.floor(diffMs / hour);
    return `${hrs}h ago`;
  }
  if (diffMs < day * 2) {
    return "yesterday";
  }
  const days = Math.floor(diffMs / day);
  return `${days}d ago`;
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasMore = useMemo(() => items.length < total, [items.length, total]);

  const loadPage = async (nextPage: number, append: boolean) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      const response = await fetch(`/api/recognitions?page=${nextPage}&pageSize=${pageSize}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as FeedResponse;
      const data = payload.data ?? [];
      const payloadTotal = payload.meta?.total ?? 0;
      setTotal(payloadTotal);
      setPage(nextPage);
      setItems((prev) => (append ? [...prev, ...data] : data));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="pb-10">
      <PageHeader
        title="Feed"
        description={total > 0 ? `${total} recognitions across the team` : "All recognitions"}
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[16px] border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No recognitions yet."
          description="Be the first to recognize someone on your team."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-[16px] border border-border bg-card p-4 transition-colors hover:border-border-strong"
            >
              <header className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={item.sender.name} size="sm" />
                  <ArrowRight size={12} className="shrink-0 text-muted" />
                  <Avatar name={item.recipient.name} size="sm" />
                  <p className="min-w-0 truncate text-xs text-muted">
                    <span className="font-medium text-foreground">{item.sender.name}</span>
                    <span className="px-1 text-muted">→</span>
                    <span className="font-medium text-foreground">{item.recipient.name}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-border bg-card-2 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                  <Image src="/logomark.png" alt="Spotcoin" width={11} height={11} />
                  {item.coinAmount}
                </div>
              </header>

              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                &ldquo;{item.message}&rdquo;
              </p>

              <footer className="mt-3 flex items-center justify-between gap-2">
                <Badge variant="neutral">
                  <span>{item.value.emoji}</span>
                  <span>{item.value.name}</span>
                </Badge>
                <span className="text-[11px] text-muted">{toTimeAgo(item.createdAt)}</span>
              </footer>
            </article>
          ))}
        </div>
      )}

      {!isLoading && hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => void loadPage(page + 1, true)}
            disabled={isLoadingMore}
            className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-border-strong disabled:opacity-60"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
