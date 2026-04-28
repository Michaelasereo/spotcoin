"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, UserPlus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AppToast } from "@/components/ui/toast";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

type Position = {
  id: string;
  name: string;
  isActive: boolean;
};

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
  position: { id: string; name: string } | null;
};

function formatLastActive(dateValue: string | null) {
  if (!dateValue) return "Never";
  return new Date(dateValue).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const roleVariant: Record<Role, "neutral" | "accent" | "outline"> = {
  ADMIN: "accent",
  MANAGER: "outline",
  EMPLOYEE: "neutral",
};

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [bonusUser, setBonusUser] = useState<AdminUser | null>(null);
  const [bonusAmount, setBonusAmount] = useState(1);
  const [bonusReason, setBonusReason] = useState("");

  const [roleUser, setRoleUser] = useState<AdminUser | null>(null);
  const [roleValue, setRoleValue] = useState<Role>("EMPLOYEE");

  const [positionUser, setPositionUser] = useState<AdminUser | null>(null);
  const [positionValue, setPositionValue] = useState<string>("");

  const [deactivateUser, setDeactivateUser] = useState<AdminUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast, showToast } = useToast();

  const memberCount = useMemo(() => users.filter((user) => !user.deletedAt).length, [users]);
  const adminCount = useMemo(() => users.filter((user) => user.role === "ADMIN").length, [users]);

  const activePositions = useMemo(
    () => positions.filter((position) => position.isActive),
    [positions],
  );

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [usersRes, positionsRes] = await Promise.all([
        fetch("/api/admin/users", { cache: "no-store" }),
        fetch("/api/admin/positions", { cache: "no-store" }),
      ]);
      const usersPayload = (await usersRes.json()) as { data?: AdminUser[]; error?: string };
      const positionsPayload = (await positionsRes.json()) as { data?: Position[]; error?: string };

      if (!usersRes.ok) {
        showToast(usersPayload.error ?? "Failed to load users", "error");
        return;
      }
      setUsers(usersPayload.data ?? []);
      setPositions(positionsPayload.data ?? []);
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

  const handlePositionChange = async () => {
    if (!positionUser) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${positionUser.id}/position`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ positionId: positionValue || null }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        showToast(payload.error ?? "Position update failed", "error");
        return;
      }
      setPositionUser(null);
      setPositionValue("");
      showToast("Position updated");
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

  const closeAllModals = () => {
    setShowInviteModal(false);
    setBonusUser(null);
    setRoleUser(null);
    setPositionUser(null);
    setPositionValue("");
    setDeactivateUser(null);
  };

  return (
    <section className="pb-10">
      <header className="flex items-start justify-between gap-3 py-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">Workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Team</h1>
          <p className="mt-1 text-xs text-muted">
            {memberCount} {memberCount === 1 ? "member" : "members"}
            {adminCount > 0 ? ` · ${adminCount} admin${adminCount === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Button type="button" onClick={() => setShowInviteModal(true)} variant="outline" size="sm">
          <UserPlus size={14} />
          Invite
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[16px] border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teammates yet."
          description="Invite your first teammate to start sending recognition."
          action={
            <Button onClick={() => setShowInviteModal(true)} variant="outline" size="sm">
              <UserPlus size={14} />
              Invite
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center gap-3 rounded-[16px] border border-border bg-card px-4 py-3.5"
            >
              <Avatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                  {user.deletedAt ? (
                    <span className="ml-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                      Deactivated
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted">
                  {user.position?.name ? `${user.position.name} · ` : ""}
                  {user.email} · Last active {formatLastActive(user.lastActiveAt)}
                </p>
              </div>
              <Badge variant={roleVariant[user.role]} className="hidden sm:inline-flex">
                {user.role}
              </Badge>
              <Dropdown>
                <DropdownTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${user.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card-2 text-muted transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </DropdownTrigger>
                <DropdownContent align="end">
                  <DropdownItem onClick={() => setBonusUser(user)}>Grant bonus coins</DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      setRoleUser(user);
                      setRoleValue(user.role);
                    }}
                  >
                    Change role
                  </DropdownItem>
                  <DropdownItem
                    onClick={() => {
                      setPositionUser(user);
                      setPositionValue(user.position?.id ?? "");
                    }}
                  >
                    Change position
                  </DropdownItem>
                  <DropdownItem
                    className="text-destructive data-[highlighted]:bg-destructive/10"
                    onClick={() => setDeactivateUser(user)}
                  >
                    Deactivate
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={showInviteModal || !!bonusUser || !!roleUser || !!positionUser || !!deactivateUser}
        onOpenChange={(open) => {
          if (!open) closeAllModals();
        }}
      >
        <SheetContent>
          {showInviteModal ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Invite someone</SheetTitle>
                <SheetDescription>
                  We&apos;ll send an email invitation with a magic link.
                </SheetDescription>
              </SheetHeader>
              <Input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                type="email"
                placeholder="name@company.com"
              />
              <Button
                onClick={handleInvite}
                disabled={isSaving || !inviteEmail}
                className="w-full"
              >
                {isSaving ? "Sending..." : "Send invite"}
              </Button>
            </div>
          ) : null}

          {bonusUser ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Grant bonus coins</SheetTitle>
                <SheetDescription>For {bonusUser.name}</SheetDescription>
              </SheetHeader>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">How many bonus coins?</label>
                <Input
                  value={bonusAmount}
                  onChange={(event) => setBonusAmount(Math.max(1, Number(event.target.value) || 1))}
                  type="number"
                  min={1}
                  max={50}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted">Reason (optional)</label>
                <Input
                  value={bonusReason}
                  onChange={(event) => setBonusReason(event.target.value)}
                  type="text"
                  placeholder="e.g. great work on Q4 launch"
                />
              </div>
              <Button onClick={handleBonusGrant} disabled={isSaving} className="w-full">
                {isSaving ? "Granting..." : "Grant"}
              </Button>
            </div>
          ) : null}

          {roleUser ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Change role</SheetTitle>
                <SheetDescription>For {roleUser.name}</SheetDescription>
              </SheetHeader>
              <select
                value={roleValue}
                onChange={(event) => setRoleValue(event.target.value as Role)}
                className="h-12 w-full rounded-[12px] border border-border bg-input px-4 text-sm text-foreground outline-none transition-colors focus:border-border-strong"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
              <Button onClick={handleRoleChange} disabled={isSaving} className="w-full">
                {isSaving ? "Saving..." : "Save role"}
              </Button>
            </div>
          ) : null}

          {positionUser ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Change position</SheetTitle>
                <SheetDescription>For {positionUser.name}</SheetDescription>
              </SheetHeader>
              {activePositions.length === 0 ? (
                <p className="text-xs text-muted">
                  No positions configured yet. Add some in Settings first.
                </p>
              ) : (
                <select
                  value={positionValue}
                  onChange={(event) => setPositionValue(event.target.value)}
                  className="h-12 w-full rounded-[12px] border border-border bg-input px-4 text-sm text-foreground outline-none transition-colors focus:border-border-strong"
                >
                  <option value="">None</option>
                  {activePositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                onClick={handlePositionChange}
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? "Saving..." : "Save position"}
              </Button>
            </div>
          ) : null}

          {deactivateUser ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>Deactivate user</SheetTitle>
                <SheetDescription>
                  {deactivateUser.name} will no longer be able to send or receive recognition.
                </SheetDescription>
              </SheetHeader>
              <Button onClick={handleDeactivate} disabled={isSaving} variant="danger" className="w-full">
                {isSaving ? "Deactivating..." : "Confirm deactivate"}
              </Button>
              <Button
                onClick={() => setDeactivateUser(null)}
                variant="outline"
                className="w-full"
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
