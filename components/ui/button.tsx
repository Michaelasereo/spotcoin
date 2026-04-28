import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 active:scale-[0.99]",
  {
    variants: {
      variant: {
        default: "bg-[#efefef] text-[#0a0a0a] hover:bg-[#e0e0e0]",
        outline: "border border-border-strong bg-transparent text-foreground hover:bg-card",
        ghost: "bg-transparent text-foreground hover:bg-card",
        secondary: "bg-card-2 text-foreground hover:bg-overlay",
        danger: "border border-destructive bg-card text-destructive hover:bg-overlay",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
