import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/status";

type CommitFileItemProps = {
  path: string;
  letter?: LetterStatus | null;
  selected?: boolean;
  onSelect?: () => void;
};

export function displayCommitPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function CommitFileItem({ path, letter, selected, onSelect }: CommitFileItemProps) {
  const className = cn(
    "flex w-full flex-col items-start overflow-clip rounded-sm px-4 py-2 text-left",
    selected ? "bg-background-muted" : "hover:bg-background-muted",
  );
  const body = (
    <div className="flex w-full items-center gap-2">
      {letter ? <FileStatusBadge type={letter} /> : null}
      <p className="min-w-0 flex-1 truncate text-[16px] leading-6 text-foreground">{displayCommitPath(path)}</p>
    </div>
  );
  if (onSelect) {
    return (
      <button type="button" className={className} onClick={onSelect}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
