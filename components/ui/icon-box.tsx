import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconBoxProps = {
  icon: LucideIcon;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { box: "h-8 w-8 rounded-[10px]", icon: 14 },
  md: { box: "h-9 w-9 rounded-[12px]", icon: 16 },
  lg: { box: "h-11 w-11 rounded-[14px]", icon: 20 },
};

export function IconBox({ icon: Icon, className, size = "md" }: IconBoxProps) {
  const sizing = sizeMap[size];
  return (
    <div
      className={cn(
        "flex items-center justify-center border border-border bg-card-2 text-foreground",
        sizing.box,
        className,
      )}
    >
      <Icon size={sizing.icon} />
    </div>
  );
}
