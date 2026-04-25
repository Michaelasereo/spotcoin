"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type WorkspaceResponse = {
  data: {
    id: string;
    onboardingComplete: boolean;
    values: Array<{ id: string; name: string; emoji: string; isActive: boolean }>;
  };
};

const suggestedValues = [
  { name: "Ownership", emoji: "🔥" },
  { name: "Collaboration", emoji: "🤝" },
  { name: "Innovation", emoji: "💡" },
  { name: "Customer First", emoji: "🎯" },
  { name: "Excellence", emoji: "🏆" },
  { name: "Integrity", emoji: "🧭" },
  { name: "Speed", emoji: "⚡" },
  { name: "Quality", emoji: "✅" },
];

function parseInviteInput(raw: string) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedValues, setSelectedValues] = useState<Array<{ name: string; emoji: string }>>([]);
  const [customValueName, setCustomValueName] = useState("");
  const [customValueEmoji, setCustomValueEmoji] = useState("✨");
  const [inviteInput, setInviteInput] = useState("");
  const [inviteResults, setInviteResults] = useState<
    Array<{ email: string; status: "success" | "failed"; message: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/admin/workspace", { cache: "no-store" });
      const payload = (await response.json()) as WorkspaceResponse;
      if (!response.ok || !payload.data) return;

      if (payload.data.onboardingComplete) {
        router.replace("/admin");
        return;
      }

      if (payload.data.values.length > 0) {
        setSelectedValues(
          payload.data.values.map((value) => ({
            name: value.name,
            emoji: value.emoji,
          })),
        );
      }
    };

    void load();
  }, [router]);

  const canContinueValues = useMemo(() => selectedValues.length >= 3, [selectedValues.length]);

  const toggleSuggested = (value: { name: string; emoji: string }) => {
    setSelectedValues((current) => {
      const exists = current.some((item) => item.name.toLowerCase() === value.name.toLowerCase());
      if (exists) {
        return current.filter((item) => item.name.toLowerCase() !== value.name.toLowerCase());
      }
      return [...current, value];
    });
  };

  const addCustomValue = () => {
    const name = customValueName.trim();
    const emoji = customValueEmoji.trim() || "✨";
    if (!name) return;

    setSelectedValues((current) => {
      if (current.some((item) => item.name.toLowerCase() === name.toLowerCase())) return current;
      return [...current, { name, emoji }];
    });
    setCustomValueName("");
  };

  const persistValuesIfNeeded = async () => {
    if (!canContinueValues) return false;
    setIsSaving(true);
    try {
      const workspaceRes = await fetch("/api/admin/workspace", { cache: "no-store" });
      const workspacePayload = (await workspaceRes.json()) as WorkspaceResponse;
      if (!workspaceRes.ok || !workspacePayload.data) return false;

      const existingNames = new Set(
        workspacePayload.data.values.map((value) => value.name.trim().toLowerCase()),
      );
      const toCreate = selectedValues.filter(
        (value) => !existingNames.has(value.name.trim().toLowerCase()),
      );

      await Promise.all(
        toCreate.map((value) =>
          fetch("/api/admin/values", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: value.name, emoji: value.emoji, isActive: true }),
          }),
        ),
      );
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const sendInvites = async () => {
    const emails = parseInviteInput(inviteInput);
    if (emails.length === 0) {
      setInviteResults([]);
      return;
    }

    setIsSaving(true);
    try {
      const uniqueEmails = Array.from(new Set(emails));
      const results = await Promise.all(
        uniqueEmails.map(async (email) => {
          try {
            const response = await fetch("/api/admin/users/invite", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email }),
            });
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            if (response.ok) {
              return { email, status: "success" as const, message: "Invite sent" };
            }
            return {
              email,
              status: "failed" as const,
              message: payload.error ?? "Invite failed",
            };
          } catch {
            return { email, status: "failed" as const, message: "Network error while sending invite" };
          }
        }),
      );
      setInviteResults(results);
    } finally {
      setIsSaving(false);
    }
  };

  const inviteSummary = useMemo(() => {
    const successCount = inviteResults.filter((result) => result.status === "success").length;
    const failedCount = inviteResults.length - successCount;
    return { successCount, failedCount };
  }, [inviteResults]);

  const completeOnboarding = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/admin/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ onboardingComplete: true }),
      });
      router.push("/admin/users");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="min-h-screen px-5 pb-8 pt-6">
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((dot) => (
          <span
            key={dot}
            className={`h-2.5 w-2.5 rounded-full ${
              step === dot ? "bg-[--text-primary]" : "bg-[--bg-card-2]"
            }`}
          />
        ))}
      </div>

      {step === 1 ? (
        <div className="text-center">
          <p className="text-4xl">🪙</p>
          <h1 className="mt-4 text-[28px] font-bold text-[--text-primary]">Welcome to Spotcoin</h1>
          <p className="mt-4 text-sm leading-relaxed text-[--text-secondary]">
            Every month your team gets 5 Spotcoins to send to colleagues. Coins received become
            Spot-tokens. At year-end, each token is worth ₦1,000 in cash.
          </p>
          <button
            onClick={() => setStep(2)}
            className="mt-8 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base]"
          >
            Get started →
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">What does your team stand for?</h2>
          <p className="mt-2 text-sm text-[--text-secondary]">Select at least 3 values to continue.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {suggestedValues.map((value) => {
              const selected = selectedValues.some(
                (item) => item.name.toLowerCase() === value.name.toLowerCase(),
              );
              return (
                <button
                  key={value.name}
                  onClick={() => toggleSuggested(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
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

          <div className="mt-4 rounded-2xl border border-[--border] bg-[--bg-card] p-4">
            <p className="mb-2 text-sm text-[--text-secondary]">Add custom value</p>
            <div className="flex gap-2">
              <input
                value={customValueEmoji}
                onChange={(event) => setCustomValueEmoji(event.target.value)}
                className="w-16 rounded-xl border border-[--border] bg-[--bg-input] px-3 py-2 text-center text-sm text-[--text-primary] outline-none"
              />
              <input
                value={customValueName}
                onChange={(event) => setCustomValueName(event.target.value)}
                placeholder="Value name"
                className="flex-1 rounded-xl border border-[--border] bg-[--bg-input] px-4 py-2 text-sm text-[--text-primary] outline-none"
              />
            </div>
            <button
              onClick={addCustomValue}
              className="mt-3 rounded-full border border-[--border-mid] px-4 py-2 text-sm text-[--text-primary]"
            >
              Add value
            </button>
          </div>

          <button
            disabled={!canContinueValues || isSaving}
            onClick={async () => {
              const ok = await persistValuesIfNeeded();
              if (ok) setStep(3);
            }}
            className="mt-6 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Continue →"}
          </button>
        </div>
      ) : null}

      {step === 3 ? (
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">Bring Spotcoin into Slack</h2>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Connect your Slack workspace so your team can recognize colleagues without leaving Slack.
          </p>
          <a
            href="/api/slack/oauth/start"
            className="mt-6 block w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-center text-sm font-semibold text-[--bg-base]"
          >
            Connect Slack
          </a>
          <button
            onClick={() => setStep(4)}
            className="mt-3 w-full text-sm text-[--text-secondary] underline"
          >
            Skip for now
          </button>
        </div>
      ) : null}

      {step === 4 ? (
        <div>
          <h2 className="text-xl font-semibold text-[--text-primary]">Who&apos;s on your team?</h2>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Add one email per line (or comma-separated) and send invites.
          </p>
          <textarea
            rows={6}
            value={inviteInput}
            onChange={(event) => setInviteInput(event.target.value)}
            placeholder={"alice@company.com\nbob@company.com"}
            className="mt-4 w-full rounded-2xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
          />
          <button
            disabled={isSaving}
            onClick={() => void sendInvites()}
            className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
          >
            {isSaving ? "Sending..." : "Send invites"}
          </button>

          {inviteResults.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-[--border] bg-[--bg-card] p-3">
              <p className="text-sm font-medium text-[--text-primary]">
                {inviteSummary.successCount} sent, {inviteSummary.failedCount} failed
              </p>
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                {inviteResults.map((result) => (
                  <p key={result.email} className="text-xs text-[--text-secondary]">
                    <span className={result.status === "success" ? "text-[--accent]" : "text-[--error]"}>
                      {result.status === "success" ? "Success" : "Failed"}
                    </span>{" "}
                    - {result.email}: {result.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          <button
            disabled={isSaving}
            onClick={() => void completeOnboarding()}
            className="mt-6 w-full rounded-full border border-[--border-mid] px-5 py-2.5 text-sm text-[--text-primary] disabled:opacity-50"
          >
            Go to dashboard →
          </button>
        </div>
      ) : null}
    </section>
  );
}
