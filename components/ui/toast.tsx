"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import type { ToastValue } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type AppToastProps = {
  toast: ToastValue | null;
};

export function AppToast({ toast }: AppToastProps) {
  if (!toast) return null;

  const isError = toast.type === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 md:bottom-6">
      <div
        className={cn(
          "pointer-events-auto flex items-start gap-3 rounded-[16px] border bg-overlay px-4 py-3 text-sm shadow-2xl shadow-black/40",
          isError ? "border-destructive/40" : "border-border",
        )}
      >
        <Icon size={16} className={isError ? "mt-0.5 text-destructive" : "mt-0.5 text-accent"} />
        <p className="text-foreground">{toast.message}</p>
      </div>
    </div>
  );
}
