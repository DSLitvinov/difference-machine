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
    "flex w-full flex-col rounded-md border p-3",
    state === "default" && "border-solid border-border bg-background shadow-sm hover:border-border-accent",
    state === "selected" && "border-solid border-border-accent bg-foreground-accent",
    state === "disabled" && "border-solid border-border bg-background-muted",
    onClick && "cursor-pointer text-left",
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
