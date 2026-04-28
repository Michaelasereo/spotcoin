import { cn } from "@/lib/utils";

type StatBlockProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
  className?: string;
};

export function StatBlock({ label, value, hint, accent, className }: StatBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>
      <p
        className={cn(
          "mt-1.5 truncate font-mono text-[32px] font-bold leading-none tracking-tight",
          accent ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 truncate text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
