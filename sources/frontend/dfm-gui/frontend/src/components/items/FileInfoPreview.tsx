import { type LucideIcon, Binary, FileText, Image } from "lucide-react";
import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { Icon } from "@/components/chrome/Icon";
import { fileKind, type FileKind } from "@/lib/file-kind";
import type { LetterStatus } from "@/lib/status";

type FileInfoPreviewProps = {
  name: string;
  src?: string;
  text?: string;
  letter?: LetterStatus | null;
  ignored?: boolean;
  locked?: boolean;
};

const kindIcon: Record<FileKind, LucideIcon> = {
  image: Image,
  blend: Image,
  text: FileText,
  binary: Binary,
};

export function FileInfoPreview({ name, src, text, letter, ignored, locked }: FileInfoPreviewProps) {
  const kind = fileKind(name);
  const filled = Boolean(src || text);
  return (
    <div className="relative size-[308px] shrink-0">
      <div className="size-[308px] overflow-hidden rounded-lg border border-border bg-background">
        {src ? (
          <img src={src} alt="" className="size-full object-cover" />
        ) : text ? (
          <pre className="pointer-events-none size-full overflow-hidden whitespace-pre-wrap break-all p-2 font-mono text-[12px] leading-4 text-foreground">
            {text}
          </pre>
        ) : null}
      </div>
      {filled ? null : (
        <div className="pointer-events-none absolute left-[144px] top-[144px] flex size-5 items-center justify-center">
          <Icon icon={kindIcon[kind]} size={20} />
        </div>
      )}
      {ignored ? <FileStatusBadge type="ignored" className="absolute left-3 top-[276px]" /> : letter ? <FileStatusBadge type={letter} className="absolute left-3 top-[276px]" /> : null}
      {locked ? <FileStatusBadge type="lock" className="absolute left-[276px] top-[276px]" /> : null}
    </div>
  );
}
