"use client";

import { cn } from "@/lib/utils";

type SegmentedItem = {
  id: string;
  label: string;
};

type SegmentedProps = {
  items: SegmentedItem[];
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

export function Segmented({ items, value, onChange, className }: SegmentedProps) {
  return (
    <div className={cn("flex rounded-full border border-border bg-card-2 p-1", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            value === item.id
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
