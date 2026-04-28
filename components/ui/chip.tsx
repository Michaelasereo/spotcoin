import { cn } from "@/lib/utils";

type ChipProps = {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Chip({ selected, onClick, children, disabled, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        selected
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-border bg-card text-muted hover:border-border-strong hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}
