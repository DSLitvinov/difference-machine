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
  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {children}
      </button>
    );
  }
  return <div className={classes}>{children}</div>;
}
