"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

const Dropdown = DropdownMenu.Root;
const DropdownTrigger = DropdownMenu.Trigger;
const DropdownContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] rounded-[16px] border border-border bg-overlay p-1 shadow-2xl shadow-black/40",
        className,
      )}
      {...props}
    />
  </DropdownMenu.Portal>
));
DropdownContent.displayName = "DropdownContent";

const DropdownItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenu.Item
    ref={ref}
    className={cn(
      "cursor-default rounded-[10px] px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-card-2",
      className,
    )}
    {...props}
  />
));
DropdownItem.displayName = "DropdownItem";

export { Dropdown, DropdownContent, DropdownItem, DropdownTrigger };
