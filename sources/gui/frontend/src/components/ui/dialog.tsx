import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

interface DialogHeaderProps {
  title: string;
  onClose: () => void;
}

export function DialogHeader({ title, onClose }: DialogHeaderProps) {
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button
        type="button"
        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
