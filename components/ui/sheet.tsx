"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <Dialog.Content
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[24px] border-t border-border bg-overlay p-6 shadow-2xl shadow-black/40",
          "md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[24px] md:border",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted transition-colors hover:border-border-strong hover:text-foreground"
        >
          <X size={14} />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-5 pr-10", className)} {...props} />;
}

function SheetTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn("text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn("mt-1 text-sm text-muted", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
