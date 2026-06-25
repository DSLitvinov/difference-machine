import { useState } from "react";
import { FileQuestion, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

interface BinaryDiffStubProps {
  onOpen: () => Promise<void>;
}

export function BinaryDiffStub({ onOpen }: BinaryDiffStubProps) {
  const t = useT();
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    setOpening(true);
    try {
      await onOpen();
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{t("preview.binaryCannotDisplay")}</p>
      <p className="text-sm text-muted-foreground">{t("preview.binaryOpenHint")}</p>
      <Button type="button" disabled={opening} onClick={() => void handleOpen()}>
        {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {t("preview.openExternal")}
      </Button>
    </div>
  );
}
