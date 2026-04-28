import { cn } from "@/lib/utils";

type InfoBannerProps = {
  title: string;
  body: string;
  variant?: "neutral" | "accent" | "danger";
  className?: string;
};

const variantClasses = {
  neutral: "border-border bg-card",
  accent: "border-accent/30 bg-accent/10",
  danger: "border-destructive/40 bg-destructive/10",
} as const;

export function InfoBanner({ title, body, variant = "neutral", className }: InfoBannerProps) {
  return (
    <div className={cn("rounded-[16px] border p-4", variantClasses[variant], className)}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}
