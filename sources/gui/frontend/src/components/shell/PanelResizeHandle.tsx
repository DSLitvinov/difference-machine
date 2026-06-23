interface PanelResizeHandleProps {
  onMouseDown: (event: React.MouseEvent) => void;
  title?: string;
}

export function PanelResizeHandle({ onMouseDown, title = "Drag to resize" }: PanelResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      title={title}
      className="relative w-px shrink-0 cursor-col-resize bg-border hover:bg-ring"
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
    </div>
  );
}
