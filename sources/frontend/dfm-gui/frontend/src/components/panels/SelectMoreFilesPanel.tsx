import { HeaderRightSide } from "@/components/items/HeaderRightSide";
import { FileInfoPreviewMulti } from "@/components/items/FileInfoPreviewMulti";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { t, type Locale } from "@/lib/i18n";
import { formatSize } from "@/lib/format";
import { typeLabel } from "@/lib/file-kind";
import type { DirEntry } from "@/store/app-store";

type SelectMoreFilesPanelProps = {
  locale: Locale;
  paths: string[];
  entries: DirEntry[];
  onCollapse: () => void;
  onApply: (paths: string[]) => void;
};

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center text-[14px] leading-5 text-foreground">
      <p className="w-[120px] shrink-0">{label}</p>
      <p className="min-w-0 flex-1 truncate">{value}</p>
    </div>
  );
}

export function SelectMoreFilesPanel({ locale, paths, entries, onCollapse, onApply }: SelectMoreFilesPanelProps) {
  const copy = t(locale);
  const selected = entries.filter((entry) => paths.includes(entry.path));
  const sum = selected.reduce((total, entry) => total + (entry.size ?? 0), 0);
  const types = [...new Set(selected.map((entry) => typeLabel(entry.name)).filter(Boolean))];
  return (
    <aside className="flex h-full w-[332px] shrink-0 flex-col overflow-hidden">
      <HeaderRightSide locale={locale} onCollapse={onCollapse} />
      <div className="flex min-h-0 flex-1 flex-col justify-between px-3 pb-3">
        <div className="flex min-h-0 flex-col gap-4">
          <FileInfoPreviewMulti />
          <div className="flex min-h-0 flex-col gap-3">
            <p className="text-[14px] font-semibold leading-5 text-foreground">{copy.metadata}</p>
            <div className="flex flex-col gap-1">
              <MetaRow label={copy.sumSizes} value={formatSize(sum)} />
              <MetaRow label={copy.type} value={types.join(", ")} />
            </div>
          </div>
        </div>
        <div className="flex w-full flex-col gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-h-9 w-full items-center gap-2 rounded-[6px] border border-border bg-background px-4 py-2.5 text-left shadow-sm"
              >
                <span className="min-w-0 flex-1 text-[14px] font-medium leading-5 text-foreground">{copy.addInCommit}</span>
                <FigmaIcon src="icons/chevrons-up-down.svg" size={20} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[308px]">
              <DropdownMenuItem>{copy.addInCommit}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" className="w-full" onClick={() => onApply(paths)}>
            {copy.apply}
          </Button>
        </div>
      </div>
    </aside>
  );
}
