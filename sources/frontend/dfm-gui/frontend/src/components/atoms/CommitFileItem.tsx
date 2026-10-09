import type { MouseEvent } from "react";
import { ChevronRight } from "lucide-react";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { Icon } from "@/components/chrome/Icon";
import { cn } from "@/lib/utils";
import type { LetterStatus } from "@/lib/status";

type CommitFileItemProps = {
  path: string;
  letter?: LetterStatus | null;
  selected?: boolean;
  onSelect?: () => void;
  onMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function displayCommitPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function CommitFileItem({ path, letter, selected, onSelect, onMenu }: CommitFileItemProps) {
  const className = cn(
    "flex w-full items-center gap-2 overflow-clip rounded-[10px] px-2.5 py-2 text-left",
    selected ? "bg-[#e4e4e7]" : "hover:bg-[#f4f4f5]",
  );
  const body = (
    <>
      {letter ? <FileStatusBadge type={letter} iconOnly /> : null}
      <p className="min-w-0 flex-1 truncate text-[14px] font-medium leading-5 text-[#18181b]">{displayCommitPath(path)}</p>
      <Icon icon={ChevronRight} size={16} />
    </>
  );
  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        onClick={onSelect}
        onContextMenu={
          onMenu
            ? (event) => {
                event.preventDefault();
                event.stopPropagation();
                onMenu(event);
              }
            : undefined
        }
      >
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
