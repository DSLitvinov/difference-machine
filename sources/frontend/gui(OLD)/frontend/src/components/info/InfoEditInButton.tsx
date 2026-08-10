import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { editorDisplayLabel } from "@/lib/externalEditors";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { openWorkdirFile } from "@/wails/forester";

interface InfoEditInButtonProps {
  filePath: string;
  disabled?: boolean;
}

export function InfoEditInButton({ filePath, disabled }: InfoEditInButtonProps) {
  const t = useT();
  const setError = useAppStore((s) => s.setError);
  const externalEditorPaths = useAppStore((s) => s.externalEditorPaths);
  const [open, setOpen] = useState(false);

  const editors = useMemo(
    () => externalEditorPaths.map((path) => ({ path, label: editorDisplayLabel(path) })),
    [externalEditorPaths],
  );

  const noEditors = editors.length === 0;
  const buttonDisabled = disabled || noEditors;

  const handleSelect = async (editorPath: string) => {
    setOpen(false);
    setError(null);
    try {
      await openWorkdirFile(filePath, editorPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={buttonDisabled}
          title={noEditors ? t("preview.editInNoEditors") : undefined}
        >
          {t("preview.editIn")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <ul className="flex flex-col">
          {editors.map((editor) => (
            <li key={editor.path}>
              <button
                type="button"
                className={cn(
                  "flex w-full rounded-sm px-2 py-1.5 text-left text-sm",
                  "hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => void handleSelect(editor.path)}
              >
                {editor.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
