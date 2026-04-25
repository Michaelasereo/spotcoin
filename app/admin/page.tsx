"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, UserPlus, X } from "lucide-react";

type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  coinsToGive: number;
  spotTokensEarned: number;
  lastActiveAt: string | null;
  deletedAt: string | null;
};

type ToastState = {
  message: string;
  type: "success" | "error";
} | null;

function formatLastActive(dateValue: string | null) {
  if (!dateValue) return "Never";
  return new Date(dateValue).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "U";
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [bonusUser, setBonusUser] = useState<AdminUser | null>(null);
  const [bonusAmount, setBonusAmount] = useState(1);
  const [bonusReason, setBonusReason] = useState("");

  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [roleValue, setRoleValue] = useState<Role>("EMPLOYEE");

  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const memberCount = useMemo(() => users.filter((user) => !user.deletedAt).length, [users]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = (await response.json()) as { data?: AdminUser[]; error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Failed to load users", "error");
        return;
      }
      setUsers(payload.data ?? []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Invite failed", "error");
        return;
      }
      setShowInviteModal(false);
      setInviteEmail("");
      showToast("Invite sent successfully");
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleBonusGrant = async () => {
    if (!bonusUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${bonusUser.id}/bonus`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: bonusAmount, reason: bonusReason || undefined }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Bonus update failed", "error");
        return;
      }
      setBonusUser(null);
      setBonusAmount(1);
      setBonusReason("");
      showToast("Bonus coins granted");
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${roleUser.id}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: roleValue }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Role update failed", "error");
        return;
      }
      setRoleUser(null);
      showToast("User role updated");
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${deactivateUser.id}/deactivate`, {
        method: "PATCH",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Deactivate failed", "error");
        return;
      }
      setDeactivateUser(null);
      showToast("User deactivated");
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="px-5 pb-8">
      <header className="py-4">
        <h1 className="text-lg font-semibold text-[--text-primary]">Team</h1>
      </header>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[--text-secondary]">{memberCount} members</p>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[--border-mid] px-4 py-2 text-sm font-medium text-[--text-primary] transition-opacity active:opacity-70"
        >
          <UserPlus size={16} />
          Invite
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-[--border] bg-[--bg-card] p-4">
              <div className="h-4 w-40 rounded bg-[--bg-card-2]" />
              <div className="mt-2 h-3 w-28 rounded bg-[--bg-card-2]" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="relative rounded-2xl border border-[--border] bg-[--bg-card] px-4 py-3.5"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[--bg-card-2] text-xs font-semibold text-[--text-secondary]">
                    {initialsFromName(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[--text-primary]">{user.name}</p>
                    <p className="truncate text-xs text-[--text-secondary]">{user.email}</p>
                    <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
                      Last active: {formatLastActive(user.lastActiveAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[--border] bg-[--bg-card-2] px-2.5 py-1 text-xs font-medium text-[--text-secondary]">
                    {user.role}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMenuId((current) => (current === user.id ? null : user.id))
                    }
                    className="rounded-full p-2 text-[--text-secondary] transition-opacity active:opacity-70"
                    aria-label={`Open actions for ${user.name}`}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {activeMenuId === user.id ? (
                <div className="absolute right-3 top-12 z-10 w-44 rounded-2xl border border-[--border] bg-[--bg-overlay] p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setBonusUser(user);
                      setActiveMenuId(null);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[--text-primary] hover:bg-[--bg-card-2]"
                  >
                    Grant bonus coins
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoleUser(user);
                      setRoleValue(user.role);
                      setActiveMenuId(null);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[--text-primary] hover:bg-[--bg-card-2]"
                  >
                    Change role
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeactivateUser(user);
                      setActiveMenuId(null);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-[--error] hover:bg-[--bg-card-2]"
                  >
                    Deactivate
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {(showInviteModal || bonusUser || roleUser || deactivateUser) && (
        <div className="fixed inset-0 z-40 bg-black/60">
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-[--border] bg-[--bg-overlay] p-5">
            {showInviteModal ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[--text-primary]">Invite someone</h2>
                  <button onClick={() => setShowInviteModal(false)} className="p-1">
                    <X size={16} className="text-[--text-secondary]" />
                  </button>
                </div>
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  type="email"
                  placeholder="name@company.com"
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
                />
                <button
                  onClick={handleInvite}
                  disabled={isSaving || !inviteEmail}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Sending..." : "Send invite"}
                </button>
              </div>
            ) : null}

            {bonusUser ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[--text-primary]">Grant bonus coins</h2>
                  <button onClick={() => setBonusUser(null)} className="p-1">
                    <X size={16} className="text-[--text-secondary]" />
                  </button>
                </div>
                <label className="mb-2 block text-sm text-[--text-secondary]">How many bonus coins?</label>
                <input
                  value={bonusAmount}
                  onChange={(event) => setBonusAmount(Math.max(1, Number(event.target.value) || 1))}
                  type="number"
                  min={1}
                  max={50}
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
                />
                <label className="mb-2 mt-3 block text-sm text-[--text-secondary]">Reason (optional)</label>
                <input
                  value={bonusReason}
                  onChange={(event) => setBonusReason(event.target.value)}
                  type="text"
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
                />
                <button
                  onClick={handleBonusGrant}
                  disabled={isSaving}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Granting..." : "Grant"}
                </button>
              </div>
            ) : null}

            {roleUser ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[--text-primary]">Change role</h2>
                  <button onClick={() => setRoleUser(null)} className="p-1">
                    <X size={16} className="text-[--text-secondary]" />
                  </button>
                </div>
                <select
                  value={roleValue}
                  onChange={(event) => setRoleValue(event.target.value as Role)}
                  className="w-full rounded-xl border border-[--border] bg-[--bg-input] px-4 py-3 text-sm text-[--text-primary] outline-none"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  onClick={handleRoleChange}
                  disabled={isSaving}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save role"}
                </button>
              </div>
            ) : null}

            {deactivateUser ? (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[--text-primary]">Deactivate user</h2>
                  <button onClick={() => setDeactivateUser(null)} className="p-1">
                    <X size={16} className="text-[--text-secondary]" />
                  </button>
                </div>
                <p className="text-sm text-[--text-secondary]">
                  Are you sure you want to deactivate {deactivateUser.name}?
                </p>
                <button
                  onClick={handleDeactivate}
                  disabled={isSaving}
                  className="mt-4 w-full rounded-full bg-[--text-primary] px-5 py-2.5 text-sm font-semibold text-[--bg-base] disabled:opacity-50"
                >
                  {isSaving ? "Deactivating..." : "Confirm deactivate"}
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
