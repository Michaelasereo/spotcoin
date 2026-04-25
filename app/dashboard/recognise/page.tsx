"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, X } from "lucide-react";

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

  const canSubmit =
    Boolean(selectedRecipient) &&
    Boolean(selectedValueId) &&
    message.trim().length >= 10 &&
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
      <section className="px-5 py-6">
        <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-[--bg-card-2]" />
            <div className="h-20 w-full rounded bg-[--bg-card-2]" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link href="/dashboard" aria-label="Back to dashboard">
          <ChevronLeft size={20} className="text-[--text-primary]" />
        </Link>
        <h1 className="text-lg font-semibold text-[--text-primary]">Recognise</h1>
      </header>

      {coinsToGive === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-3xl">🪙</p>
          <p className="mt-3 text-sm text-[--text-primary]">You've used all your coins this month.</p>
          <p className="mt-1 text-sm text-[--text-secondary]">
            They refill on the 1st. Come back then.
          </p>
        </div>
      ) : didSubmit && selectedRecipient ? (
        <div className="mt-8 rounded-2xl border border-[--border-mid] bg-[--bg-card] p-5 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 text-sm font-semibold text-[--text-primary]">
            Spotcoin sent to {selectedRecipient.name}!
          </p>
          <button
            type="button"
            onClick={resetForm}
            className="mt-4 text-sm text-[--text-secondary] underline"
          >
            Send another
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] text-[--text-secondary]">Who deserves a Spotcoin?</p>
            {selectedRecipient ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-[--accent-border] bg-[--accent-bg] px-3 py-1 text-sm text-[--accent]">
                <span>{selectedRecipient.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRecipient(null);
                    setSearch("");
                    setSearchResults([]);
                  }}
                  aria-label="Clear selected recipient"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name..."
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition-colors focus:border-[--border-mid]"
                />
                {isSearching ? (
                  <p className="mt-2 text-xs text-[--text-tertiary]">Searching...</p>
                ) : null}
                {searchResults.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                          setSelectedRecipient(user);
                          setSearchResults([]);
                          setSearch("");
                        }}
                        className="flex w-full items-start justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3 text-left"
                      >
                        <span className="text-sm text-[--text-primary]">{user.name}</span>
                        <span className="text-xs text-[--text-secondary]">{user.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div>
            <p className="mb-2 text-[13px] text-[--text-secondary]">What did they demonstrate?</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {values.map((value) => {
                const selected = selectedValueId === value.id;
                return (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => setSelectedValueId(value.id)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${
                      selected
                        ? "border-[--accent-border] bg-[--accent-bg] text-[--accent]"
                        : "border-[--border] bg-[--bg-card] text-[--text-secondary]"
                    }`}
                  >
                    {value.emoji} {value.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] text-[--text-secondary]">Tell them why</p>
            <textarea
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] outline-none transition-colors focus:border-[--border-mid]"
              placeholder="Share what they did well..."
            />
            <p className="mt-1 text-right text-xs text-[--text-tertiary]">{message.length} / 280</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] text-[--text-secondary]">How many coins?</p>
              <p className="text-xs text-[--text-secondary]">You have {coinsToGive} left</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableCoins.map((coin) => {
                const selected = coinAmount === coin;
                return (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => setCoinAmount(coin)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      selected
                        ? "border-[--accent-border] bg-[--accent-bg] text-[--accent]"
                        : "border-[--border] bg-[--bg-card] text-[--text-secondary]"
                    }`}
                  >
                    {coin}
                  </button>
                );
              })}
            </div>
          </div>

          {submitError ? (
            <div className="rounded-2xl border border-[--error] bg-[--bg-card] px-4 py-3">
              <p className="text-sm text-[--text-primary]">{submitError}</p>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] transition-opacity active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Sending..." : "Send Spotcoin 🪙"}
          </button>
        </div>
      )}
    </section>
  );
}
