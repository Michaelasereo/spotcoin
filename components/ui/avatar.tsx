import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-border bg-card-2 font-semibold text-foreground/80",
        sizeClasses[size],
        className,
      )}
    >
      {initials || "U"}
    </div>
  );
}
