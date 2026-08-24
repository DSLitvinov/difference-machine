import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SidebarCardDirectoryProps = {
  state?: "default" | "selected" | "disabled";
  children: ReactNode;
};

export function SidebarCardDirectory({ state = "default", children }: SidebarCardDirectoryProps) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-2 rounded-md border p-3",
        state === "selected" && "border-dashed border-border-accent bg-foreground-accent",
        state === "disabled" && "border-solid border-border bg-background-muted",
        state === "default" && "border-solid border-border bg-background",
      )}
    >
      {children}
    </div>
  );
}
