import { useT } from "@/lib/i18n";

interface PanelResizeHandleProps {
  onMouseDown: (event: React.MouseEvent) => void;
  title?: string;
}

export function PanelResizeHandle({ onMouseDown, title }: PanelResizeHandleProps) {
  const t = useT();
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title ?? t("preview.dragResize")}
      className="relative w-px shrink-0 cursor-col-resize bg-border hover:bg-ring"
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
