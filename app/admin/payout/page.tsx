"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CheckCircle2, Download } from "lucide-react";
import { AppToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

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

function naira(value: number) {
  return `₦${value.toLocaleString("en-NG")}`;
}

export default function AdminPayoutPage() {
  const [data, setData] = useState<LedgerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<LedgerEntry | null>(null);
  const { toast, showToast } = useToast();

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
      <section className="pb-10">
        <PageHeader title="Year-End Payout" backHref="/admin" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[16px] border border-border bg-card p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const hasOpenWindow = data.payoutWindow?.status === "OPEN";
  const progressPct =
    data.summary.totalEmployees > 0
      ? Math.round((completedCount / data.summary.totalEmployees) * 100)
      : 0;

  return (
    <section className="pb-10">
      <PageHeader title="Year-End Payout" backHref="/admin" description="Run payout for the year" />

      {!hasOpenWindow ? (
        <div className="space-y-4">
          <div className="rounded-[20px] border border-border bg-card p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Total Spot Tokens
            </p>
            <p className="mt-2 font-mono text-[40px] font-bold leading-none tracking-tight text-foreground">
              {data.summary.totalSpotTokens}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
              <Banknote size={12} />
              Projected payout: {naira(data.summary.totalNaira)}
            </p>
          </div>

          <div className="rounded-[16px] border border-warning/30 bg-warning/5 p-4">
            <p className="text-sm font-semibold text-foreground">Heads up</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Opening the payout window notifies your team and generates the Finance CSV. This action
              cannot be undone.
            </p>
          </div>

          <Button onClick={() => setConfirmOpen(true)} className="w-full">
            Open payout window
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[20px] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                Progress
              </p>
              <span className="font-mono text-xs text-muted">
                {completedCount} / {data.summary.totalEmployees}
              </span>
            </div>
            <p className="mt-2 font-mono text-3xl font-bold leading-none text-foreground">
              {progressPct}%
            </p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-card-2">
              <div
                className="h-full rounded-full bg-accent transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <Button
              onClick={() => void handleExportCSV()}
              className="mt-4"
              variant="outline"
              size="sm"
            >
              <Download size={14} />
              Export CSV
            </Button>
          </div>

          {data.entries.length === 0 ? (
            <div className="rounded-[20px] border border-accent/30 bg-accent/10 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/15">
                <CheckCircle2 size={20} className="text-accent" />
              </div>
              <p className="mt-3 text-sm font-semibold text-foreground">Payout complete</p>
              <p className="mt-1 text-xs text-muted">All employees have been paid out.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-[16px] border border-border bg-card px-4 py-3.5"
                >
                  <Avatar name={entry.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{entry.name}</p>
                    <p className="truncate text-[11px] text-muted">{entry.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {naira(entry.nairaValue)}
                    </p>
                    {entry.payoutStatus === "COMPLETED" ? (
                      <Badge variant="accent">Paid</Badge>
                    ) : (
                      <Button
                        onClick={() => setConfirmUser(entry)}
                        variant="outline"
                        size="sm"
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Sheet
        open={confirmOpen || !!confirmUser}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmOpen(false);
            setConfirmUser(null);
          }
        }}
      >
        <SheetContent>
          {confirmOpen ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Open payout window?</SheetTitle>
                <SheetDescription>
                  This will allow Finance to process {naira(data.summary.totalNaira)} across{" "}
                  {data.summary.totalEmployees}{" "}
                  {data.summary.totalEmployees === 1 ? "employee" : "employees"}.
                </SheetDescription>
              </SheetHeader>
              <Button onClick={() => void handleOpenWindow()} disabled={isSaving} className="w-full">
                {isSaving ? "Opening..." : "Confirm"}
              </Button>
              <Button
                onClick={() => setConfirmOpen(false)}
                className="w-full"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          ) : null}

          {confirmUser ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Confirm payout?</SheetTitle>
                <SheetDescription>
                  Confirm {naira(confirmUser.nairaValue)} payment to {confirmUser.name}? This will
                  zero out their Spot Tokens.
                </SheetDescription>
              </SheetHeader>
              <Button
                onClick={() => void handleMarkComplete()}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Processing..." : "Confirm"}
              </Button>
              <Button
                onClick={() => setConfirmUser(null)}
                className="w-full"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <AppToast toast={toast} />
    </section>
  );
}
