import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-[10px] border border-[#d4d4d8] bg-white px-2.5 py-0 text-sm font-normal leading-5 text-[#18181b] shadow-[0_1px_2px_rgba(0,0,0,0.05)] placeholder:text-[#71717a] focus-visible:border-[#60a5fa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a0c9fc] disabled:cursor-not-allowed disabled:border-[#e4e4e7] disabled:text-[#a1a1aa] disabled:shadow-none disabled:placeholder:text-[#a1a1aa] aria-[invalid=true]:border-[#dc2626] aria-[invalid=true]:focus-visible:border-[#dc2626] aria-[invalid=true]:focus-visible:ring-[#ea7d7d] dark:border-border dark:bg-background dark:text-foreground",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
