import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-[12px] border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted/60 outline-none transition-colors focus:border-border-strong focus:bg-card-2",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
