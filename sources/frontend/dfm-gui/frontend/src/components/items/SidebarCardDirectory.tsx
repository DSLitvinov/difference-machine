import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarCardDirectoryProps = {
  state?: "default" | "selected" | "disabled";
  children: ReactNode;
  onClick?: () => void;
};

export function SidebarCardDirectory({ state = "default", children, onClick }: SidebarCardDirectoryProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 rounded-md border p-3",
        state === "selected" && "border-dashed border-border-accent bg-foreground-accent",
        state === "disabled" && "border-solid border-border bg-background-muted",
        state === "default" && "border-solid border-border bg-background shadow-sm",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
