"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Heart, House, Settings, Wallet } from "lucide-react";

type BottomNavProps = {
  isAdmin: boolean;
};

export function BottomNav({ isAdmin }: BottomNavProps) {
  const pathname = usePathname();

  const items = [
    { href: "/dashboard", label: "Home", icon: House },
    { href: "/dashboard/feed", label: "Feed", icon: Activity },
    { href: "/dashboard/recognise", label: "Recognise", icon: Heart },
    { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[--nav-border] bg-[--nav-bg] px-2 py-3">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1">
              <Icon
                size={22}
                className={isActive ? "text-[--nav-active]" : "text-[--nav-inactive]"}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-[--nav-active]" : "text-[--nav-inactive]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
