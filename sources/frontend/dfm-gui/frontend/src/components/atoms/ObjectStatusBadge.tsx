import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const objectStatusBadge = cva(
  "inline-flex h-5 items-center justify-center whitespace-nowrap rounded-[4px] border border-black/[0.08] px-1 pb-px pt-[3px] text-[12px] font-semibold uppercase leading-4 text-[#fafafa]",
  {
    variants: {
      type: {
        merge: "bg-[var(--badge-object-merge,#16a34a)]",
        rename: "bg-[var(--badge-object-rename,#a855f7)]",
        delete: "bg-[var(--badge-object-delete,#dc2626)]",
      },
    },
  },
);

const LABEL = {
  merge: "MERGE",
  rename: "RENAME",
  delete: "DELETE",
} as const;

export type ObjectStatusType = NonNullable<VariantProps<typeof objectStatusBadge>["type"]>;

type ObjectStatusBadgeProps = {
  type: ObjectStatusType;
  className?: string;
};

export function ObjectStatusBadge({ type, className }: ObjectStatusBadgeProps) {
  return <span className={cn(objectStatusBadge({ type }), className)}>{LABEL[type]}</span>;
}

export function objectStatusTypes(tags: string[] | undefined): ObjectStatusType[] {
  if (!tags?.length) {
    return [];
  }
  const out: ObjectStatusType[] = [];
  for (const tag of tags) {
    const key = tag.trim().toLowerCase();
    if (key === "merge" || key === "rename" || key === "delete") {
      out.push(key);
    }
  }
  return out;
}
