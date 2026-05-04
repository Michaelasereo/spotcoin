"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCanCreatePollsOrEvents } from "@/components/DashboardRoleProvider";

type EventRow = {
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
  _count: { rsvps: number; comments: number };
};

export default function EventsPage() {
  const { showToast } = useToast();
  const canCreate = useCanCreatePollsOrEvents();
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [venue, setVenue] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events?when=${when}`, { cache: "no-store" });
      const json = (await res.json()) as { data?: EventRow[]; error?: string };
      if (!res.ok) {
        showToast(json.error ?? "Failed to load events", "error");
        return;
      }
      setEvents(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [showToast, when]);

  useEffect(() => {
    void load();
  }, [load]);

  const createEvent = async () => {
    if (!title.trim() || !startsAt) {
      showToast("Title and start time are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description || null,
          location: location || null,
          venue: venue || null,
          coverImageUrl: coverImageUrl || null,
          linkUrl: linkUrl || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(json.error ?? "Could not create event", "error");
        return;
      }
      showToast("Event created");
      setSheetOpen(false);
      setTitle("");
      setDescription("");
      setLocation("");
      setVenue("");
      setCoverImageUrl("");
      setLinkUrl("");
      setStartsAt("");
      setEndsAt("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="pb-10">
      <PageHeader
        title="Events & Hangouts"
        description="Company socials and hangouts — RSVP and join the conversation."
        action={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setSheetOpen(true)} className="gap-1.5">
              <Plus size={14} />
              New
            </Button>
          ) : null
        }
      />

      <div className="mb-4">
        <Segmented
          items={[
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
          ]}
          value={when}
          onChange={(v) => setWhen(v as typeof when)}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events yet."
          description={canCreate ? "Create a hangout or social for the team." : "Check back when something is scheduled."}
        />
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/dashboard/events/${ev.id}`}
              className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex gap-3">
                {ev.coverImageUrl ? (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-card-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.coverImageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-border bg-card-2 text-muted">
                    <CalendarDays size={22} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-foreground">{ev.title}</h2>
                  <p className="mt-1 text-[11px] text-muted">
                    {new Date(ev.startsAt).toLocaleString()}
                    {ev.endsAt ? ` → ${new Date(ev.endsAt).toLocaleString()}` : ""}
                  </p>
                  {(ev.location || ev.venue) && (
                    <p className="mt-1 text-xs text-muted">
                      {[ev.venue, ev.location].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-muted">
                    {ev._count.rsvps} RSVPs · {ev._count.comments} comments
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New event</SheetTitle>
            <SheetDescription>Add a hangout or social for the workspace.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-6">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Venue</label>
                <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">Cover image URL</label>
              <Input value={coverImageUrl} onChange={(e) => setCoverImageUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted">External link</label>
              <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Starts</label>
                <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted">Ends (optional)</label>
                <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
            <Button type="button" disabled={saving} onClick={() => void createEvent()}>
              {saving ? "Saving…" : "Create event"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
