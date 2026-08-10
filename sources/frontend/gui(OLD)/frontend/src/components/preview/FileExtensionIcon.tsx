import type { LucideIcon } from "lucide-react";
import {
  Box,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
} from "lucide-react";

import { fileExtensionKind, type FileExtensionKind } from "@/lib/fileKinds";
import { cn } from "@/lib/utils";

const ICON_BY_KIND: Record<FileExtensionKind, LucideIcon> = {
  image: FileImage,
  text: FileCode,
  blend: FileArchive,
  mesh3d: Box,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  none: File,
  other: FileArchive,
};

interface FileExtensionIconProps {
  extension: string;
  className?: string;
}

export function FileExtensionIcon({ extension, className }: FileExtensionIconProps) {
  const Icon = ICON_BY_KIND[fileExtensionKind(extension)];
  return <Icon aria-hidden className={cn("h-4 w-4 shrink-0 text-muted-foreground", className)} />;
}
