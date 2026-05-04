"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type EventDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  venue: string | null;
  coverImageUrl: string | null;
  linkUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  rsvpCounts: { going: number; interested: number; notGoing: number };
  viewerRsvp: "GOING" | "INTERESTED" | "NOT_GOING" | null;
};

type CommentRow = {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

export default function EventDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { showToast } = useToast();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [evRes, cRes] = await Promise.all([
        fetch(`/api/events/${id}`, { cache: "no-store" }),
        fetch(`/api/events/${id}/comments`, { cache: "no-store" }),
      ]);
      const evJson = (await evRes.json()) as { data?: EventDetail; error?: string };
      const cJson = (await cRes.json()) as { data?: CommentRow[]; error?: string };
      if (!evRes.ok) {
        showToast(evJson.error ?? "Event not found", "error");
        setEvent(null);
        return;
      }
      setEvent(evJson.data ?? null);
      setComments(cJson.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setRsvp = async (status: "GOING" | "INTERESTED" | "NOT_GOING") => {
    if (!id) return;
    const res = await fetch(`/api/events/${id}/rsvp`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(json.error ?? "RSVP failed", "error");
      return;
    }
    showToast("RSVP updated");
    await load();
  };

  const postComment = async () => {
    if (!id || !commentText.trim()) return;
    const res = await fetch(`/api/events/${id}/comments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: commentText }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(json.error ?? "Could not post comment", "error");
      return;
    }
    setCommentText("");
    await load();
  };

  if (loading) {
    return (
      <section className="pb-10">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
      </section>
    );
  }

  if (!event) {
    return (
      <section className="pb-10 text-center text-sm text-muted">
        <Link href="/dashboard/events" className="underline">
          Back to events
        </Link>
      </section>
    );
  }

  return (
    <section className="pb-10">
      {event.coverImageUrl ? (
        <div className="relative -mx-5 mb-4 h-40 overflow-hidden rounded-none border-b border-border md:mx-0 md:rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      ) : null}

      <PageHeader title={event.title} description={event.description ?? "Event details"} backHref="/dashboard/events" />

      <p className="mt-1 text-xs text-muted">
        {new Date(event.startsAt).toLocaleString()}
        {event.endsAt ? ` → ${new Date(event.endsAt).toLocaleString()}` : ""}
      </p>
      {(event.venue || event.location) && <p className="mt-2 text-sm text-foreground">{[event.venue, event.location].filter(Boolean).join(" · ")}</p>}
      {event.linkUrl ? (
        <a href={event.linkUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-foreground underline">
          Open link
        </a>
      ) : null}

      <div className="mt-6 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted">RSVP</p>
        <p className="mt-1 text-[11px] text-muted">
          Going {event.rsvpCounts.going} · Interested {event.rsvpCounts.interested} · Can&apos;t go {event.rsvpCounts.notGoing}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={event.viewerRsvp === "GOING" ? "default" : "outline"} onClick={() => void setRsvp("GOING")}>
            Going
          </Button>
          <Button type="button" size="sm" variant={event.viewerRsvp === "INTERESTED" ? "default" : "outline"} onClick={() => void setRsvp("INTERESTED")}>
            Interested
          </Button>
          <Button type="button" size="sm" variant={event.viewerRsvp === "NOT_GOING" ? "default" : "outline"} onClick={() => void setRsvp("NOT_GOING")}>
            Can&apos;t go
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground">Comments</h2>
        <ul className="mt-3 space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2">
                <Avatar name={c.user.name} size="sm" />
                <span className="text-xs font-medium text-foreground">{c.user.name}</span>
                <span className="text-[10px] text-muted">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-foreground/90">{c.message}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment…" />
          <Button type="button" size="sm" onClick={() => void postComment()}>
            Post
          </Button>
        </div>
      </div>
    </section>
  );
}
