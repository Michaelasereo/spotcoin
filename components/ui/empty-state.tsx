import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      {Icon ? (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px] border border-border bg-card-2">
          <Icon size={18} className="text-muted" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
