import { FileX } from "lucide-react";

import { useT } from "@/lib/i18n";

interface DeletedDiffStubProps {
  path: string;
}

export function DeletedDiffStub({ path }: DeletedDiffStubProps) {
  const t = useT();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <FileX className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{t("preview.fileDeleted")}</p>
      <p className="max-w-full truncate font-mono text-sm text-muted-foreground">{path}</p>
      <p className="text-sm text-muted-foreground">{t("preview.fileDeletedHint")}</p>
    </div>
  );
}
