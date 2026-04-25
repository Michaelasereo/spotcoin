"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type LedgerEntry = {
  id: string;
  name: string;
  email: string;
  spotTokensEarned: number;
  payoutStatus: "PENDING" | "COMPLETED";
  nairaValue: number;
};

type LedgerData = {
  payoutWindow: { id: string; status: "OPEN" | "CLOSED"; openedAt: string } | null;
  tokenValueNaira: number;
  entries: LedgerEntry[];
  summary: {
    totalEmployees: number;
    totalSpotTokens: number;
    totalNaira: number;
  };
};

type ToastState = { message: string; type: "success" | "error" } | null;

function naira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export default function AdminPayoutPage() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<LedgerEntry | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadLedger = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/payout", { cache: "no-store" });
      const payload = (await response.json()) as { data?: LedgerData; error?: string };
      if (!response.ok || !payload.data) {
        showToast(payload.error ?? "Failed to load payout ledger", "error");
        return;
      }
      setData(payload.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLedger();
  }, []);

  const completedCount = useMemo(
    () => data?.entries.filter((entry) => entry.payoutStatus === "COMPLETED").length ?? 0,
    [data],
  );

  const handleOpenWindow = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/payout/open", { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Failed to open payout window", "error");
        return;
      }
      setConfirmOpen(false);
      showToast("Payout window opened");
      await loadLedger();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!confirmUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/payout/${confirmUser.id}/complete`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Failed to mark payout complete", "error");
        return;
      }
      setConfirmUser(null);
      showToast("Payout marked complete");
      await loadLedger();
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = async () => {
    const response = await fetch("/api/admin/payout/export-csv");
    if (!response.ok) {
      showToast("CSV export failed", "error");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "spotcoin-payout.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !data) {
    return (
      <section className="px-5 pb-8">
        <header className="flex items-center gap-3 py-4">
          <Link href="/admin" aria-label="Back to admin">
            <ChevronLeft size={20} className="text-[--text-primary]" />
          </Link>
          <h1 className="text-lg font-semibold text-[--text-primary]">Year-End Payout</h1>
        </header>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-[--border] bg-[--bg-card] p-4">
              <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
              <div className="mt-2 h-3 w-24 rounded bg-[--bg-card-2]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const hasOpenWindow = data.payoutWindow?.status === "OPEN";

  return (
    <section className="px-5 pb-8">
      <header className="flex items-center gap-3 py-4">
        <Link href="/admin" aria-label="Back to admin">
          <ChevronLeft size={20} className="text-[--text-primary]" />
        </Link>
        <h1 className="text-lg font-semibold text-[--text-primary]">Year-End Payout</h1>
      </header>

      {!hasOpenWindow ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[--text-secondary]">
              Total Spot Tokens across team
            </p>
            <p className="mt-1 font-mono text-4xl font-bold text-[--text-primary]">
              {data.summary.totalSpotTokens}
            </p>
            <p className="mt-2 text-sm text-[--accent]">
              Total projected payout: {naira(data.summary.totalNaira)}
            </p>
          </div>

          <div className="rounded-2xl border border-[--border-mid] bg-[--bg-card] p-4">
            <p className="text-sm text-[--text-secondary]">
              Opening the payout window notifies your team and generates the Finance CSV.
              This action cannot be undone.
            </p>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base]"
          >
            Open Payout Window
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[--border] bg-[--bg-card] p-4">
            <p className="text-sm text-[--text-secondary]">
              {completedCount} of {data.summary.totalEmployees} employees paid out
            </p>
            <div className="mt-2 h-2 rounded-full bg-[--bg-card-2]">
              <div
                className="h-2 rounded-full bg-[--accent]"
                style={{
                  width: `${data.summary.totalEmployees > 0 ? (completedCount / data.summary.totalEmployees) * 100 : 0}%`,
                }}
              />
            </div>
            <button
              onClick={() => void handleExportCSV()}
              className="mt-3 rounded-full border border-[--border-mid] px-4 py-2 text-sm text-[--text-primary]"
            >
              Export CSV
            </button>
          </div>

          {data.entries.length === 0 ? (
            <div className="rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-8 text-center text-sm text-[--accent]">
              Payout complete 🎉
            </div>
          ) : (
            <div className="space-y-2">
              {data.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5"
                >
                  <div>
                    <p className="text-sm text-[--text-primary]">{entry.name}</p>
                    <p className="text-xs text-[--text-secondary]">{entry.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-[--text-primary]">
                      {naira(entry.nairaValue)}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        entry.payoutStatus === "COMPLETED"
                          ? "border-[--accent-border] bg-[--accent-bg] text-[--accent]"
                          : "border-[--border] bg-[--bg-card-2] text-[--text-secondary]"
                      }`}
                    >
                      {entry.payoutStatus === "COMPLETED" ? "paid" : "pending"}
                    </span>
                    {entry.payoutStatus === "PENDING" ? (
                      <button
                        onClick={() => setConfirmUser(entry)}
                        className="mt-2 block w-full rounded-full border border-[--border-mid] px-3 py-1.5 text-xs text-[--text-primary]"
                      >
                        Mark paid
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(confirmOpen || confirmUser) && (
        <div className="fixed inset-0 z-40 bg-black/60">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-[--border] bg-[--bg-overlay] p-5">
            {confirmOpen ? (
              <div>
                <h2 className="text-base font-semibold text-[--text-primary]">Open payout window?</h2>
                <p className="mt-2 text-sm text-[--text-secondary]">
                  This will allow Finance to process {naira(data.summary.totalNaira)} across{" "}
                  {data.summary.totalEmployees} employees.
                </p>
                <button
                  onClick={() => void handleOpenWindow()}
                  disabled={isSaving}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Opening..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="mt-2 w-full rounded-full border border-[--border-mid] px-5 py-2.5 text-sm text-[--text-primary]"
                >
                  Cancel
                </button>
              </div>
            ) : null}

            {confirmUser ? (
              <div>
                <h2 className="text-base font-semibold text-[--text-primary]">Confirm payout?</h2>
                <p className="mt-2 text-sm text-[--text-secondary]">
                  Confirm {naira(confirmUser.nairaValue)} payment to {confirmUser.name}?
                </p>
                <button
                  onClick={() => void handleMarkComplete()}
                  disabled={isSaving}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Processing..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmUser(null)}
                  className="mt-2 w-full rounded-full border border-[--border-mid] px-5 py-2.5 text-sm text-[--text-primary]"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {toast ? (
        <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-40px)] max-w-lg -translate-x-1/2">
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              toast.type === "success"
                ? "border-[--accent-border] bg-[--bg-overlay] text-[--text-primary]"
                : "border-[--error] bg-[--bg-overlay] text-[--text-primary]"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </section>
  );
}
