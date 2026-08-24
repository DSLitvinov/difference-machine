import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-[14px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-background-primary text-foreground-primary shadow-sm hover:bg-background-primary/90",
        outline: "border border-border bg-background text-foreground shadow-sm hover:bg-background-light",
        ghost: "bg-transparent text-foreground hover:bg-background-muted",
        secondary: "bg-background-light text-foreground hover:bg-background-muted",
        destructive: "bg-[#dc2626] text-foreground-primary shadow-sm hover:bg-[#b91c1c]",
      },
      size: {
        default: "h-10 rounded-md px-4",
        icon: "size-10 rounded-md p-2",
        window: "size-6 rounded-sm p-0.5",
        menu: "h-10 rounded-sm px-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";
