"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Heart, Search, Sparkles, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type SearchUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

type CompanyValue = {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
};

type MeResponse = {
  data: {
    id: string;
    name: string;
    coinsToGive: number;
  };
};

type ValuesResponse = {
  data: CompanyValue[];
};

type SearchResponse = {
  data: SearchUser[];
};

const MAX_MESSAGE = 280;
const MIN_MESSAGE = 10;

export default function RecognisePage() {
  const [coinsToGive, setCoinsToGive] = useState(0);
  const [isBootLoading, setIsBootLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<SearchUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [values, setValues] = useState<CompanyValue[]>([]);
  const [selectedValueId, setSelectedValueId] = useState("");

  const [message, setMessage] = useState("");
  const [coinAmount, setCoinAmount] = useState(1);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didSubmit, setDidSubmit] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const [meRes, valuesRes] = await Promise.all([
          fetch("/api/users/me", { cache: "no-store" }),
          fetch("/api/workspace/values", { cache: "no-store" }),
        ]);

        const me = (await meRes.json()) as MeResponse;
        const companyValues = (await valuesRes.json()) as ValuesResponse;

        const coins = me.data?.coinsToGive ?? 0;
        setCoinsToGive(coins);
        setCoinAmount(coins > 0 ? 1 : 0);
        setValues(companyValues.data ?? []);
      } finally {
        setIsBootLoading(false);
      }
    };

    void loadBootstrap();
  }, []);

  useEffect(() => {
    if (selectedRecipient || !search.trim()) {
      setSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as SearchResponse;
        setSearchResults(payload.data ?? []);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, selectedRecipient]);

  const availableCoins = useMemo(
    () => Array.from({ length: Math.max(0, coinsToGive) }, (_, i) => i + 1),
    [coinsToGive],
  );

  const messageOk = message.trim().length >= MIN_MESSAGE && message.length <= MAX_MESSAGE;
  const canSubmit =
    Boolean(selectedRecipient) &&
    Boolean(selectedValueId) &&
    messageOk &&
    coinAmount >= 1 &&
    coinsToGive > 0 &&
    !isSubmitting;

  const resetForm = () => {
    setSearch("");
    setSearchResults([]);
    setSelectedRecipient(null);
    setSelectedValueId("");
    setMessage("");
    setCoinAmount(coinsToGive > 0 ? 1 : 0);
    setSubmitError("");
    setDidSubmit(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedRecipient) return;

    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/recognitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedRecipient.id,
          valueId: selectedValueId,
          message: message.trim(),
          coinAmount,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setSubmitError(payload.error ?? "Could not send Spotcoin. Please try again.");
        return;
      }

      setDidSubmit(true);
      setCoinsToGive((prev) => Math.max(0, prev - coinAmount));
    } catch {
      setSubmitError("Could not send Spotcoin. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBootLoading) {
    return (
      <section className="pb-10">
        <PageHeader title="Recognise" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </section>
    );
  }

  if (coinsToGive === 0 && !didSubmit) {
    return (
      <section className="pb-10">
        <PageHeader title="Recognise" />
        <EmptyState
          icon={Sparkles}
          title="You've used all your coins this month."
          description="They refill on the 1st. Come back then to recognise more teammates."
        />
      </section>
    );
  }

  if (didSubmit && selectedRecipient) {
    return (
      <section className="pb-10">
        <PageHeader title="Recognise" />
        <div className="rounded-[20px] border border-accent/30 bg-accent/10 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/15">
            <Heart size={20} className="text-accent" />
          </div>
          <p className="mt-4 text-base font-semibold tracking-tight text-foreground">
            Spotcoin sent to {selectedRecipient.name}
          </p>
          <p className="mt-1 text-xs text-muted">They&apos;ll be notified in Slack shortly.</p>
          <Button onClick={resetForm} variant="outline" className="mt-6 w-full">
            Send another
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <PageHeader
        title="Recognise"
        description={`You have ${coinsToGive} ${coinsToGive === 1 ? "coin" : "coins"} to give`}
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Recipient
          </label>
          {selectedRecipient ? (
            <div className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={selectedRecipient.name} size="sm" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedRecipient.name}
                  </p>
                  <p className="truncate text-[11px] text-muted">{selectedRecipient.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecipient(null);
                  setSearch("");
                  setSearchResults([]);
                }}
                aria-label="Clear selected recipient"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card-2 text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name..."
                  className="pl-10"
                />
              </div>
              {isSearching ? (
                <p className="px-1 text-[11px] text-muted">Searching...</p>
              ) : null}
              {searchResults.length > 0 ? (
                <div className="space-y-1.5 rounded-[14px] border border-border bg-card p-1.5">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(user);
                        setSearchResults([]);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-card-2"
                    >
                      <Avatar name={user.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{user.name}</p>
                        <p className="truncate text-[11px] text-muted">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Value demonstrated
          </label>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const selected = selectedValueId === value.id;
              return (
                <Chip
                  key={value.id}
                  onClick={() => setSelectedValueId(value.id)}
                  selected={selected}
                >
                  {value.emoji} {value.name}
                </Chip>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Message
          </label>
          <Textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Share what they did well..."
          />
          <div className="flex items-center justify-between px-1 text-[11px]">
            <span className={message.length > 0 && !messageOk ? "text-destructive" : "text-muted"}>
              Min {MIN_MESSAGE} characters
            </span>
            <span className="font-mono text-muted">
              {message.length} / {MAX_MESSAGE}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              Coins to send
            </label>
            <span className="text-[11px] text-muted">{coinsToGive} left this month</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCoins.map((coin) => {
              const selected = coinAmount === coin;
              return (
                <Chip
                  key={coin}
                  onClick={() => setCoinAmount(coin)}
                  selected={selected}
                  className="min-w-[44px] justify-center font-mono"
                >
                  {coin}
                </Chip>
              );
            })}
          </div>
        </div>

        {submitError ? (
          <div className="rounded-[14px] border border-destructive/40 bg-destructive/10 px-4 py-3">
            <p className="text-sm text-destructive">{submitError}</p>
          </div>
        ) : null}

        <Button type="button" disabled={!canSubmit} onClick={handleSubmit} className="w-full">
          {isSubmitting ? (
            "Sending..."
          ) : (
            <>
              Send Spotcoin
              <Image src="/logomark.png" alt="" width={14} height={14} />
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
