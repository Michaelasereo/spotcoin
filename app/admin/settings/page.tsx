"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

type CompanyValue = {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
};

type WorkspaceSettings = {
  id: string;
  name: string;
  monthlyAllowance: number;
  tokenValueNaira: number;
  slackTeamId: string | null;
  targetChannelId: string | null;
  recognitionSchedule: string;
  timezone: string;
  values: CompanyValue[];
};

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

type ModalState =
  | { type: "workspaceName"; value: string }
  | { type: "monthlyAllowance"; value: number }
  | { type: "tokenValueNaira"; value: number }
  | { type: "channelId"; value: string }
  | { type: "timezone"; value: string }
  | { type: "addValue"; name: string; emoji: string }
  | null;

const scheduleOptions = [
  { id: "EVERY_MONDAY", label: "Every Monday" },
  { id: "LAST_MONDAY", label: "Last Monday" },
] as const;

const emojiChoices = ["🔥", "🚀", "🤝", "🎯", "💡", "🌟", "⚡", "🧠", "🏆", "🙌"];

export default function AdminSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspace, setWorkspace] = useState<WorkspaceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [oauthBanner, setOauthBanner] = useState<ToastState>(null);

  const activeValuesCount = useMemo(
    () => workspace?.values.filter((value) => value.isActive).length ?? 0,
    [workspace],
  );

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/workspace", { cache: "no-store" });
      const payload = (await response.json()) as { data?: WorkspaceSettings; error?: string };
      if (!response.ok || !payload.data) {
        showToast(payload.error ?? "Failed to load workspace settings", "error");
        return;
      }
      setWorkspace(payload.data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    const slackStatus = searchParams.get("slack");
    if (!slackStatus) return;

    const statusMessageMap: Record<string, ToastState> = {
      connected: { type: "success", message: "Slack workspace connected successfully." },
      oauth_denied: { type: "error", message: "Slack connection was canceled." },
      missing_code: { type: "error", message: "Slack OAuth code is missing. Please try again." },
      invalid_state: { type: "error", message: "Slack OAuth session expired. Please reconnect." },
      not_configured: { type: "error", message: "Slack OAuth is not configured in environment." },
      invalid_response: { type: "error", message: "Slack returned an invalid response." },
      workspace_not_found: { type: "error", message: "Workspace could not be resolved for Slack install." },
      oauth_failed: { type: "error", message: "Slack connection failed. Please try again." },
    };

    setOauthBanner(
      statusMessageMap[slackStatus] ?? { type: "error", message: "Slack connection failed." },
    );

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("slack");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const patchWorkspace = async (data: Partial<WorkspaceSettings>) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/workspace", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as { data?: WorkspaceSettings; error?: string };
      if (!response.ok || !payload.data) {
        showToast(payload.error ?? "Unable to save changes", "error");
        return false;
      }
      setWorkspace(payload.data);
      showToast("Settings updated");
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  const toggleValue = async (value: CompanyValue) => {
    if (!workspace) return;
    if (!value.isActive && activeValuesCount >= 10) {
      showToast("Maximum 10 active values allowed", "error");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/values/${value.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: !value.isActive }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Unable to update value", "error");
        return;
      }
      await loadSettings();
      showToast("Value updated");
    } finally {
      setIsSaving(false);
    }
  };

  const saveModal = async () => {
    if (!workspace || !modal) return;

    if (modal.type === "workspaceName") {
      if (!modal.value.trim()) return;
      const ok = await patchWorkspace({ name: modal.value.trim() });
      if (ok) setModal(null);
      return;
    }

    if (modal.type === "monthlyAllowance") {
      const ok = await patchWorkspace({ monthlyAllowance: Math.max(1, modal.value) });
      if (ok) setModal(null);
      return;
    }

    if (modal.type === "tokenValueNaira") {
      const ok = await patchWorkspace({ tokenValueNaira: Math.max(1, modal.value) });
      if (ok) setModal(null);
      return;
    }

    if (modal.type === "channelId") {
      const ok = await patchWorkspace({ targetChannelId: modal.value.trim() || null });
      if (ok) setModal(null);
      return;
    }

    if (modal.type === "timezone") {
      if (!modal.value.trim()) return;
      const ok = await patchWorkspace({ timezone: modal.value.trim() });
      if (ok) setModal(null);
      return;
    }

    if (modal.type === "addValue") {
      if (!modal.name.trim() || !modal.emoji.trim()) return;
      if (activeValuesCount >= 10) {
        showToast("Maximum 10 active values allowed", "error");
        return;
      }
      setIsSaving(true);
      try {
        const response = await fetch("/api/admin/values", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: modal.name.trim(), emoji: modal.emoji.trim(), isActive: true }),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          showToast(payload.error ?? "Unable to add value", "error");
          return;
        }
        setModal(null);
        await loadSettings();
        showToast("Value added");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleExport = async () => {
    const response = await fetch("/api/admin/export");
    if (!response.ok) {
      showToast("Export failed", "error");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "spotcoin-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !workspace) {
    return (
      <section className="px-5 pb-8">
        <header className="py-4">
          <h1 className="text-lg font-semibold text-[--text-primary]">Settings</h1>
        </header>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-[--border] bg-[--bg-card] p-4">
              <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
              <div className="mt-2 h-3 w-24 rounded bg-[--bg-card-2]" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 pb-8">
      <header className="py-4">
        <h1 className="text-lg font-semibold text-[--text-primary]">Settings</h1>
      </header>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">General</p>
          <div className="space-y-2">
            <button
              onClick={() => setModal({ type: "monthlyAllowance", value: workspace.monthlyAllowance })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left"
            >
              <span className="text-sm text-[--text-primary]">Monthly coins per person</span>
              <span className="text-sm text-[--text-secondary]">{workspace.monthlyAllowance}</span>
            </button>
            <button
              onClick={() => setModal({ type: "tokenValueNaira", value: workspace.tokenValueNaira })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left"
            >
              <span className="text-sm text-[--text-primary]">Token value (₦ per Spot-token)</span>
              <span className="text-sm text-[--text-secondary]">₦{workspace.tokenValueNaira}</span>
            </button>
            <button
              onClick={() => setModal({ type: "workspaceName", value: workspace.name })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left"
            >
              <span className="text-sm text-[--text-primary]">Workspace name</span>
              <span className="text-sm text-[--text-secondary]">{workspace.name}</span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">Company Values</p>
          <div className="space-y-2">
            {workspace.values.map((value) => (
              <div
                key={value.id}
                className="flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5"
              >
                <span className="text-sm text-[--text-primary]">
                  {value.emoji} {value.name}
                </span>
                <button
                  disabled={isSaving}
                  onClick={() => void toggleValue(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    value.isActive
                      ? "border-[--accent-border] bg-[--accent-bg] text-[--accent]"
                      : "border-[--border] bg-[--bg-card-2] text-[--text-secondary]"
                  }`}
                >
                  {value.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            ))}

            <button
              onClick={() => setModal({ type: "addValue", name: "", emoji: "🔥" })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left text-sm text-[--text-primary]"
            >
              Add value
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">Slack</p>
          {oauthBanner ? (
            <div
              className={`mb-2 rounded-xl border px-3 py-2 text-xs ${
                oauthBanner.type === "success"
                  ? "border-[--accent-border] bg-[--accent-bg] text-[--accent]"
                  : "border-[--error] bg-[--bg-card] text-[--text-primary]"
              }`}
            >
              {oauthBanner.message}
            </div>
          ) : null}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5">
              <span className="text-sm text-[--text-primary]">Slack workspace</span>
              {workspace.slackTeamId ? (
                <span className="rounded-full border border-[--accent-border] bg-[--accent-bg] px-2.5 py-1 text-xs font-medium text-[--accent]">
                  Connected
                </span>
              ) : (
                <a
                  href="/api/slack/oauth/start"
                  className="rounded-full bg-[--text-primary] px-4 py-2 text-xs font-semibold text-[--bg-base]"
                >
                  Connect Slack
                </a>
              )}
            </div>

            <button
              onClick={() => setModal({ type: "channelId", value: workspace.targetChannelId ?? "" })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left"
            >
              <span className="text-sm text-[--text-primary]">Recognition channel</span>
              <span className="text-sm text-[--text-secondary]">
                {workspace.targetChannelId || "Not set"}
              </span>
            </button>

            <div className="rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5">
              <p className="mb-2 text-sm text-[--text-primary]">Recognition Monday</p>
              <div className="flex rounded-full border border-[--border] bg-[--bg-card] p-1">
                {scheduleOptions.map((option) => (
                  <button
                    key={option.id}
                    disabled={isSaving}
                    onClick={() => void patchWorkspace({ recognitionSchedule: option.id })}
                    className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                      workspace.recognitionSchedule === option.id
                        ? "bg-[--bg-overlay] text-[--text-primary]"
                        : "text-[--text-secondary]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setModal({ type: "timezone", value: workspace.timezone })}
              className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left"
            >
              <span className="text-sm text-[--text-primary]">Timezone</span>
              <span className="text-sm text-[--text-secondary]">{workspace.timezone}</span>
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[--text-secondary]">Danger</p>
          <button
            onClick={() => void handleExport()}
            className="flex w-full items-center justify-between rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5 text-left text-sm text-[--error]"
          >
            Export all data
          </button>
        </div>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-40 bg-black/60">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-[--border] bg-[--bg-overlay] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[--text-primary]">
                {modal.type === "workspaceName" && "Workspace name"}
                {modal.type === "monthlyAllowance" && "Monthly coins per person"}
                {modal.type === "tokenValueNaira" && "Token value (₦ per Spot-token)"}
                {modal.type === "channelId" && "Recognition channel"}
                {modal.type === "timezone" && "Timezone"}
                {modal.type === "addValue" && "Add company value"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1">
                <X size={16} className="text-[--text-secondary]" />
              </button>
            </div>

            {modal.type === "addValue" ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {emojiChoices.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setModal({ ...modal, emoji })}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        modal.emoji === emoji
                          ? "border-[--accent-border] bg-[--accent-bg]"
                          : "border-[--border] bg-[--bg-card]"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <input
                  value={modal.name}
                  onChange={(event) => setModal({ ...modal, name: event.target.value })}
                  placeholder="Value name"
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
                />
              </div>
            ) : modal.type === "monthlyAllowance" || modal.type === "tokenValueNaira" ? (
              <input
                value={modal.value}
                onChange={(event) =>
                  setModal({
                    ...modal,
                    value: Math.max(1, Number(event.target.value) || 1),
                  })
                }
                type="number"
                min={1}
                className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
              />
            ) : (
              <input
                value={modal.value}
                onChange={(event) => setModal({ ...modal, value: event.target.value })}
                className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
              />
            )}

            <button
              onClick={() => void saveModal()}
              disabled={isSaving}
              className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : null}

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
