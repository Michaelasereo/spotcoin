import { cn } from "@/lib/utils";

type ListRowProps = {
  className?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  title: string;
  description?: string;
  onClick?: () => void;
};

export function ListRow({ className, left, right, title, description, onClick }: ListRowProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-[16px] border border-border bg-card px-4 py-3.5 text-left transition-colors",
        onClick && "hover:border-border-strong hover:bg-card-2",
        className,
      )}
      onClick={onClick}
      type={onClick ? "button" : undefined}
    >
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{title}</p>
          {description ? <p className="truncate text-xs text-muted">{description}</p> : null}
        </div>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </Comp>
  );
}
