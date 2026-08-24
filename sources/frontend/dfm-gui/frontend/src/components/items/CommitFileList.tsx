import { CommitFileItem } from "@/components/atoms/CommitFileItem";
import { DiffFileListPlaceholder } from "@/components/placeholders/DiffFileListPlaceholder";
import { letterFromDiffStatus } from "@/lib/status";
import type { Locale } from "@/lib/i18n";
import type { NameStatusFile } from "@/lib/revision-cache";

type CommitFileListProps = {
  locale: Locale;
  files?: NameStatusFile[];
  selectedPath?: string;
  onSelect: (path: string) => void;
};

export function CommitFileList({ locale, files, selectedPath, onSelect }: CommitFileListProps) {
  if (!files) {
    return <div className="h-full w-[342px] shrink-0 overflow-y-auto border-r border-border" />;
  }
  if (files.length === 0) {
    return (
      <div className="flex h-full w-[342px] shrink-0 items-center justify-center overflow-hidden border-r border-border">
        <DiffFileListPlaceholder locale={locale} />
      </div>
    );
  }
  return (
    <div className="h-full w-[342px] shrink-0 overflow-y-auto border-r border-border py-1">
      {files.map((file) => (
        <CommitFileItem
          key={file.path}
          path={file.path}
          letter={letterFromDiffStatus(file.status)}
          selected={file.path === selectedPath}
          onSelect={() => onSelect(file.path)}
        />
      ))}
    </div>
  );
}
