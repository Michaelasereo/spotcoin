"use client";

import { useCallback, useState } from "react";

export type ToastValue = {
  message: string;
  type?: "success" | "error";
};

export function useToast() {
  const [toast, setToast] = useState<ToastValue | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  return { toast, showToast };
}
