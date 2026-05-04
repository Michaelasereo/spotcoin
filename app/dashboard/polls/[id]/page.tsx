"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCanCreatePollsOrEvents } from "@/components/DashboardRoleProvider";

type PollOptionDto = {
  id: string;
  label: string;
  optionUserId: string | null;
  optionUser: { id: string; name: string; avatarUrl: string | null } | null;
  sortOrder: number;
  voteCount: number;
};

type PollDto = {
  id: string;
  kind: "POLL" | "AWARD";
  title: string;
  description: string | null;
  multiSelect: boolean;
  startsAt: string;
  endsAt: string;
  resultVisibility: "AUTO_AFTER_END" | "MANUAL";
  resultsEffectiveVisible: boolean;
  resultsVisible: boolean;
  votingOpen: boolean;
  createdBy: { id: string; name: string };
  options: PollOptionDto[];
  viewerOptionIds: string[];
};

export default function PollDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { showToast } = useToast();
  const canManage = useCanCreatePollsOrEvents();
  const [poll, setPoll] = useState<PollDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${id}`, { cache: "no-store" });
      const json = (await res.json()) as { data?: PollDto; error?: string };
      if (!res.ok) {
        showToast(json.error ?? "Poll not found", "error");
        setPoll(null);
        return;
      }
      setPoll(json.data ?? null);
      setSelected(json.data?.viewerOptionIds ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const vote = async () => {
    if (!id) return;
    const res = await fetch(`/api/polls/${id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optionIds: selected }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(json.error ?? "Vote failed", "error");
      return;
    }
    showToast("Vote saved");
    await load();
  };

  const closePoll = async () => {
    if (!id) return;
    const res = await fetch(`/api/polls/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(json.error ?? "Could not close poll", "error");
      return;
    }
    showToast("Poll closed");
    await load();
  };

  const toggleResults = async (value: boolean) => {
    if (!id) return;
    const res = await fetch(`/api/polls/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "toggleResults", value }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(json.error ?? "Could not update visibility", "error");
      return;
    }
    showToast("Results visibility updated");
    await load();
  };

  if (loading) {
    return (
      <section className="pb-10">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-4 h-40 w-full rounded-2xl" />
      </section>
    );
  }

  if (!poll) {
    return (
      <section className="pb-10 text-center text-sm text-muted">
        <p>Poll not found.</p>
        <Link href="/dashboard/polls" className="mt-2 inline-block underline">
          Back to polls
        </Link>
      </section>
    );
  }

  return (
    <section className="pb-10">
      <PageHeader title={poll.title} description={poll.description ?? "Poll details"} backHref="/dashboard/polls" />

      <div className="mt-2 flex flex-wrap gap-2">
        <Badge variant={poll.kind === "AWARD" ? "accent" : "neutral"}>{poll.kind === "AWARD" ? "Award" : "Poll"}</Badge>
        {poll.votingOpen ? <Badge variant="outline">Live voting</Badge> : null}
        {poll.resultsEffectiveVisible ? <Badge variant="neutral">Results visible</Badge> : null}
      </div>

      <p className="mt-3 text-xs text-muted">
        {new Date(poll.startsAt).toLocaleString()} → {new Date(poll.endsAt).toLocaleString()} · Created by {poll.createdBy.name}
      </p>

      {poll.resultsEffectiveVisible ? (
        <ul className="mt-6 space-y-3">
          {poll.options.map((opt) => {
            const max = Math.max(1, ...poll.options.map((o) => o.voteCount));
            const pct = Math.round((opt.voteCount / max) * 100);
            return (
              <li key={opt.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{opt.label}</span>
                  <span className="text-muted">{opt.voteCount} votes</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-card-2">
                  <div className="h-full bg-foreground/70" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted">Results are hidden until the poll ends or an admin publishes them.</p>
      )}

      {poll.votingOpen ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-medium text-muted">Your vote</p>
          <div className="space-y-2">
            {poll.options.map((opt) => (
              <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type={poll.multiSelect ? "checkbox" : "radio"}
                  name="vote-detail"
                  checked={selected.includes(opt.id)}
                  onChange={() => {
                    if (poll.multiSelect) {
                      setSelected((prev) => (prev.includes(opt.id) ? prev.filter((x) => x !== opt.id) : [...prev, opt.id]));
                    } else {
                      setSelected([opt.id]);
                    }
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
          <Button type="button" className="mt-4" size="sm" onClick={() => void vote()}>
            Submit vote
          </Button>
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-8 flex flex-wrap gap-2">
          {poll.votingOpen ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void closePoll()}>
              End voting now
            </Button>
          ) : null}
          {poll.resultVisibility === "MANUAL" ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => void toggleResults(true)}>
                Show results
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => void toggleResults(false)}>
                Hide results
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/dashboard/polls" className="underline-offset-4 hover:underline">
          Back to all polls
        </Link>
      </p>
    </section>
  );
}
