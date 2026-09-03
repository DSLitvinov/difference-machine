import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DiffTextSplitRowProps = {
  line: number;
  text?: string;
  type?: "added" | "deleted" | "default";
  children?: ReactNode;
};

const tone = {
  added: {
    row: "bg-[rgba(5,150,105,0.1)]",
    meta: "border-[#047857] text-[#047857]",
    prefix: "+",
  },
  deleted: {
    row: "bg-[rgba(220,38,38,0.1)]",
    meta: "border-[#ef4444] text-[#ef4444]",
    prefix: "-",
  },
  default: {
    row: "",
    meta: "border-border text-foreground-muted",
    prefix: " ",
  },
} as const;

export function DiffTextSplitRow({ line, text, type = "default", children }: DiffTextSplitRowProps) {
  const spec = tone[type];
  return (
    <div className={cn("flex w-full items-center text-[16px] leading-6", spec.row)}>
      <div className={cn("flex w-10 shrink-0 flex-col items-center justify-center border-r px-4", spec.meta)}>
        <span className="min-w-3 text-center">{line || ""}</span>
      </div>
      <div className="flex min-w-0 items-center pl-1 font-normal">
        <span className={cn("w-3 shrink-0", spec.meta)}>{spec.prefix}</span>
        <span className="whitespace-pre text-foreground">{children ?? text ?? ""}</span>
      </div>
    </div>
  );
}
