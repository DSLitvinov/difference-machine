import { FileStatusBadge } from "@/components/atoms/FileStatusBadge";
import { FigmaIcon } from "@/components/chrome/FigmaIcon";
import { fileKind, type FileKind } from "@/lib/file-kind";
import type { LetterStatus } from "@/lib/status";
import imageIcon from "@/assets/icons/image.svg";
import fileTextIcon from "@/assets/icons/file-text.svg";
import binaryIcon from "@/assets/icons/binary.svg";

type FileInfoPreviewProps = {
  name: string;
  src?: string;
  letter?: LetterStatus | null;
  locked?: boolean;
};

const kindIcon: Record<FileKind, string> = {
  image: imageIcon,
  blend: imageIcon,
  text: fileTextIcon,
  binary: binaryIcon,
};

export function FileInfoPreview({ name, src, letter, locked }: FileInfoPreviewProps) {
  const kind = fileKind(name);
  return (
    <div className="relative size-[308px] shrink-0">
      <div className="size-[308px] overflow-hidden rounded-lg border border-border bg-background">
        {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
      </div>
      {src ? null : (
        <div className="pointer-events-none absolute left-[144px] top-[144px] flex size-5 items-center justify-center">
          <FigmaIcon src={kindIcon[kind]} size={20} />
        </div>
      )}
      {letter ? <FileStatusBadge type={letter} className="absolute left-3 top-[276px]" /> : null}
      {locked ? <FileStatusBadge type="lock" className="absolute left-[276px] top-[276px]" /> : null}
    </div>
  );
}
