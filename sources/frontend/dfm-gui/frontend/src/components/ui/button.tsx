import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-xs leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0c9fc] [&:active]:text-content-on-solid [&:active_svg]:text-content-on-solid dark:[&:active]:text-content-on-solid dark:[&:active_svg]:text-content-on-solid disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "border border-[#18181b] bg-[#27272a] font-normal text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#52525b] hover:font-medium active:bg-[#18181b] active:font-medium active:shadow-none focus-visible:font-medium focus-visible:shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)] disabled:border-[#e4e4e7] disabled:bg-[#d4d4d8] disabled:font-medium disabled:text-[#a1a1aa] disabled:shadow-none",
        outline:
          "border border-[#d4d4d8] bg-white font-medium text-[#18181b] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#e4e4e7] active:border-[#52525b] active:bg-[#52525b] disabled:border-[#d4d4d8] disabled:bg-[#d4d4d8] disabled:text-[#a1a1aa] disabled:shadow-none dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-background-muted",
        secondary:
          "border border-[#d4d4d8] bg-white font-medium text-[#18181b] shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#e4e4e7] active:border-[#52525b] active:bg-[#52525b] disabled:border-[#d4d4d8] disabled:bg-[#d4d4d8] disabled:text-[#a1a1aa] disabled:shadow-none dark:border-border dark:bg-background dark:text-foreground dark:hover:bg-background-muted",
        ghost:
          "border border-transparent bg-transparent font-medium text-[#18181b] drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-layer-secondary-hovered hover:drop-shadow-none active:bg-[#52525b] active:drop-shadow-none disabled:text-[#a1a1aa] dark:text-foreground",
        destructive:
          "border border-[#dc2626] bg-[#dc2626] font-medium text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#b91c1c] disabled:border-[#e4e4e7] disabled:bg-[#d4d4d8] disabled:text-[#a1a1aa] disabled:shadow-none",
      },
      size: {
        default: "min-h-[26px] px-3 py-1",
        icon: "size-[26px] p-1",
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
