"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

type SidebarProps = {
  isAdmin: boolean;
};

export function Sidebar({ isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const items = getNavItems(isAdmin);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-background/40 px-4 py-6 backdrop-blur md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-border bg-card">
          <Image src="/logomark.png" alt="Spotcoin" width={18} height={18} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-foreground">Spotcoin</span>
          <span className="text-[11px] text-muted">Recognition</span>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border border-border-strong bg-card text-foreground"
                  : "border border-transparent text-muted hover:bg-card hover:text-foreground",
              )}
            >
              <Icon size={16} className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 rounded-[16px] border border-border bg-card p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Tip</p>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
          Send a recognition every Monday — small streaks build big culture.
        </p>
      </div>
    </aside>
  );
}
