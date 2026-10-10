import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarCardProps = {
  state?: "default" | "selected" | "disabled";
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};

export function SidebarCard({ state = "default", className, children, onClick }: SidebarCardProps) {
  const classes = cn(
    "flex w-full flex-col rounded-[14px] border border-solid p-4",
    state === "default" && "border-border bg-background shadow-sm",
    state === "selected" && "border-border-accent bg-background shadow-sm",
    state === "disabled" && "border-border bg-[#f8f8f9] shadow-none dark:bg-background-muted",
    onClick && "cursor-pointer text-left outline-none",
    onClick &&
      state !== "disabled" &&
      "hover:border-border-accent hover:ring-2 hover:ring-[#a0c9fc] focus:border-border-accent focus:ring-2 focus:ring-[#a0c9fc]",
    className,
  );
  return (
    <div
      className={classes}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
