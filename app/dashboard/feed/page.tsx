"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, ArrowRight, CalendarDays } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

type FeedItem = {
  id: string;
  message: string;
  coinAmount: number;
  createdAt: string;
  sender: { displayName: string; avatarUrl: string | null };
  recipient: { displayName: string; avatarUrl: string | null };
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

type PollDto = {
  id: string;
  kind: "POLL" | "AWARD";
  title: string;
  votingOpen: boolean;
  resultsEffectiveVisible: boolean;
  endsAt: string;
};

type EventRow = {
  id: string;
  title: string;
  startsAt: string;
  location: string | null;
  venue: string | null;
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

function FeedTabsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as "recognition" | "polls" | "events") || "recognition";

  const setTab = (nextTab: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", nextTab);
    router.replace(`/dashboard/feed?${next.toString()}`);
  };

  const [recItems, setRecItems] = useState<FeedItem[]>([]);
  const [recPage, setRecPage] = useState(1);
  const [recPageSize] = useState(20);
  const [recTotal, setRecTotal] = useState(0);
  const [recLoading, setRecLoading] = useState(tab === "recognition");
  const [recLoadingMore, setRecLoadingMore] = useState(false);

  const [polls, setPolls] = useState<PollDto[]>([]);
  const [pollsLoading, setPollsLoading] = useState(tab === "polls");

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(tab === "events");

  const hasMoreRec = useMemo(() => recItems.length < recTotal, [recItems.length, recTotal]);

  const loadRecognition = async (nextPage: number, append: boolean) => {
    if (tab !== "recognition") return;
    if (append) setRecLoadingMore(true);
    else setRecLoading(true);
    try {
      const response = await fetch(`/api/recognitions?page=${nextPage}&pageSize=${recPageSize}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as FeedResponse;
      const data = payload.data ?? [];
      const payloadTotal = payload.meta?.total ?? 0;
      setRecTotal(payloadTotal);
      setRecPage(nextPage);
      setRecItems((prev) => (append ? [...prev, ...data] : data));
    } finally {
      if (append) setRecLoadingMore(false);
      else setRecLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "recognition") {
      void loadRecognition(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab !== "polls") return;
    let cancelled = false;
    (async () => {
      setPollsLoading(true);
      try {
        const res = await fetch("/api/polls?status=all", { cache: "no-store" });
        const json = (await res.json()) as { data?: PollDto[] };
        if (!cancelled) setPolls((json.data ?? []).filter((p) => p.votingOpen || new Date(p.endsAt) > new Date()).slice(0, 20));
      } finally {
        if (!cancelled) setPollsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "events") return;
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      try {
        const res = await fetch("/api/events?when=upcoming", { cache: "no-store" });
        const json = (await res.json()) as { data?: EventRow[] };
        if (!cancelled) setEvents(json.data ?? []);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const headerDescription =
    tab === "recognition"
      ? recTotal > 0
        ? `${recTotal} recognitions across the team`
        : "All recognitions"
      : tab === "polls"
        ? "Open polls and awards"
        : "Upcoming hangouts and socials";

  return (
    <section className="pb-10">
      <PageHeader title="Feed" description={headerDescription} />

      <div className="mb-4">
        <Segmented
          items={[
            { id: "recognition", label: "Recognition" },
            { id: "polls", label: "Polls & Awards" },
            { id: "events", label: "Events" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "recognition" ? (
        <>
          {recLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[16px] border border-border bg-card p-4">
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
          ) : recItems.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recognitions yet."
              description="Be the first to recognize someone on your team."
            />
          ) : (
            <div className="space-y-3">
              {recItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[16px] border border-border bg-card p-4 transition-colors hover:border-border-strong"
                >
                  <header className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={item.sender.displayName} size="sm" />
                      <ArrowRight size={12} className="shrink-0 text-muted" />
                      <Avatar name={item.recipient.displayName} size="sm" />
                      <p className="min-w-0 truncate text-xs text-muted">
                        <span className="font-medium text-foreground">{item.sender.displayName}</span>
                        <span className="px-1 text-muted">→</span>
                        <span className="font-medium text-foreground">{item.recipient.displayName}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-card-2 px-2 py-0.5 font-mono text-xs font-semibold text-foreground">
                      <Image src="/logomark.png" alt="Spotcoin" width={11} height={11} />
                      {item.coinAmount}
                    </div>
                  </header>

                  <p className="mt-3 text-sm leading-relaxed text-foreground/90">&ldquo;{item.message}&rdquo;</p>

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

          {!recLoading && hasMoreRec ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => void loadRecognition(recPage + 1, true)}
                disabled={recLoadingMore}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-border-strong disabled:opacity-60"
              >
                {recLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "polls" ? (
        pollsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : polls.length === 0 ? (
          <EmptyState icon={Activity} title="Nothing open right now." description="See all polls on Polls & Awards." />
        ) : (
          <div className="space-y-3">
            {polls.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/polls/${p.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={p.kind === "AWARD" ? "accent" : "neutral"}>{p.kind === "AWARD" ? "Award" : "Poll"}</Badge>
                  {p.votingOpen ? <Badge variant="outline">Open</Badge> : null}
                  {p.resultsEffectiveVisible ? <Badge variant="neutral">Results</Badge> : null}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">{p.title}</p>
                <p className="mt-1 text-[11px] text-muted">Ends {new Date(p.endsAt).toLocaleString()}</p>
              </Link>
            ))}
          </div>
        )
      ) : null}

      {tab === "events" ? (
        eventsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming events." description="Browse Events & Hangouts for the full list." />
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <Link
                key={ev.id}
                href={`/dashboard/events/${ev.id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
              >
                <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                <p className="mt-1 text-[11px] text-muted">{new Date(ev.startsAt).toLocaleString()}</p>
                {(ev.venue || ev.location) && <p className="mt-1 text-xs text-muted">{[ev.venue, ev.location].filter(Boolean).join(" · ")}</p>}
              </Link>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <section className="pb-10">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-4 h-10 w-full rounded-full" />
        </section>
      }
    >
      <FeedTabsInner />
    </Suspense>
  );
}
