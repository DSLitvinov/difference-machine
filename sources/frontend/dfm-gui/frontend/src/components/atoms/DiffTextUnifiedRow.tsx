import { cn } from "@/lib/utils";

type DiffTextUnifiedRowProps = {
  type?: "added" | "deleted" | "default";
  oldNo?: number | null;
  newNo?: number | null;
  text: string;
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

export function DiffTextUnifiedRow({ type = "default", oldNo, newNo, text }: DiffTextUnifiedRowProps) {
  const spec = tone[type];
  return (
    <div className={cn("flex w-full items-center text-[16px] leading-6", spec.row)}>
      <div className={cn("flex w-10 shrink-0 flex-col items-center justify-center border-r px-4", spec.meta)}>
        <span className="min-w-3 text-center">{oldNo ?? ""}</span>
      </div>
      <div className={cn("flex w-10 shrink-0 flex-col items-center justify-center border-r px-4", spec.meta)}>
        <span className="min-w-3 text-center">{newNo ?? ""}</span>
      </div>
      <div className="flex min-w-0 items-center pl-1 font-normal">
        <span className={cn("w-3 shrink-0", spec.meta)}>{spec.prefix}</span>
        <span className="whitespace-pre text-foreground">{text}</span>
      </div>
    </div>
  );
}
