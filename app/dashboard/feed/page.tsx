"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";

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

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
        <div className="h-3 w-20 rounded bg-[--bg-card-2]" />
        <div className="h-16 w-full rounded bg-[--bg-card-2]" />
      </div>
    </div>
  );
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
    <section className="px-5 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link href="/dashboard" aria-label="Back to dashboard">
          <ChevronLeft size={20} className="text-[--text-primary]" />
        </Link>
        <h1 className="text-lg font-semibold text-[--text-primary]">Feed</h1>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-[--text-secondary]">No recognitions yet.</p>
          <p className="mt-1 text-xs text-[--text-tertiary]">
            Be the first to recognize someone.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-[--border] bg-[--bg-card] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[--text-secondary]">
                    <span className="font-medium text-[--text-primary]">{item.sender.name}</span>
                    {" → "}
                    <span className="font-medium text-[--text-primary]">
                      {item.recipient.name}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                    {toTimeAgo(item.createdAt)}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-[--text-primary]">
                  🪙 {item.coinAmount}
                </p>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-[--text-primary]">"{item.message}"</p>

              <div className="mt-3">
                <span className="rounded-full border border-[--border] bg-[--bg-card-2] px-2 py-0.5 text-[10px] font-medium text-[--text-secondary]">
                  {item.value.emoji} {item.value.name}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {!isLoading && hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadPage(page + 1, true)}
            disabled={isLoadingMore}
            className="rounded-full border border-[--border-mid] px-4 py-2 text-sm font-medium text-[--text-primary] transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
