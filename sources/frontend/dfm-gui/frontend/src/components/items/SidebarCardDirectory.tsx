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
        "flex w-full items-start gap-2 rounded-[14px] border border-solid p-4",
        state === "selected" && "border-border-accent bg-background shadow-sm",
        state === "default" && "border-border bg-background shadow-sm hover:border-border-accent",
        state === "disabled" && "border-border bg-[#f8f8f9] dark:bg-background-muted",
        onClick && state !== "disabled" && "cursor-pointer",
      )}
      onClick={state === "disabled" ? undefined : onClick}
    >
      {children}
    </div>
  );
}
