import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarCardProps = {
  state?: "default" | "selected" | "disabled";
  children: ReactNode;
};

export function SidebarCard({ state = "default", children }: SidebarCardProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col rounded-md border p-3",
        state === "default" && "border-border bg-background shadow-sm hover:border-border-accent",
        state === "selected" && "border-border-accent bg-foreground-accent",
        state === "disabled" && "border-border bg-background-muted",
      )}
    >
      {children}
    </div>
  );
}
