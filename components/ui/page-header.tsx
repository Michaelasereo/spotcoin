"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, backHref = "/dashboard", action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 py-5">
      <div className="flex min-w-0 items-start gap-3">
        <Link
          href={backHref}
          aria-label={`Back from ${title}`}
          className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[12px] border border-border bg-card text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? (
            <p className="mt-0.5 text-xs text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </header>
  );
}
