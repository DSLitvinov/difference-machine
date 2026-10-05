import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap text-[12px] leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border border-[#18181b] bg-[#27272a] font-normal text-white shadow-[0_1px_1px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[#3f3f46]",
        outline:
          "border border-[#d4d4d8] bg-white font-medium text-[#18181b] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-background-light dark:border-border dark:bg-background dark:text-foreground",
        ghost: "bg-transparent font-medium text-foreground hover:bg-background-muted",
        secondary: "bg-background-light font-medium text-foreground hover:bg-background-muted",
        destructive: "border border-[#dc2626] bg-[#dc2626] font-normal text-white shadow-sm hover:bg-[#b91c1c]",
      },
      size: {
        default: "min-h-[26px] rounded-md px-3 py-1",
        icon: "size-[26px] rounded-md p-1",
        window: "size-6 rounded-sm p-0.5",
        menu: "min-h-[26px] rounded-sm px-3 py-1",
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
