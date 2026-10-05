import { X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/chrome/Icon";
import { cn } from "@/lib/utils";

type DialogProps = {
  title: string;
  titleId: string;
  closeLabel: string;
  busy?: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Nova dialog: 52px header, 16px body, tinted footer. Width comes from className. */
export function Dialog({ title, titleId, closeLabel, busy, onClose, className, children, footer }: DialogProps) {
  const [backdropArmed, setBackdropArmed] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        className={cn(
          "flex max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] dark:border-border dark:bg-background",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[52px] w-full shrink-0 items-center justify-between px-4">
          <p id={titleId} className="min-w-0 truncate text-[18px] font-medium leading-[21.6px] text-[#18181b] dark:text-foreground">
            {title}
          </p>
          <button
            type="button"
            className="flex size-4 shrink-0 items-center justify-center text-[#18181b] disabled:opacity-50 dark:text-foreground"
            aria-label={closeLabel}
            disabled={busy}
            onClick={onClose}
          >
            <Icon icon={X} size={16} />
          </button>
        </div>
        <div className="flex w-full flex-col gap-4 p-4">{children}</div>
        {footer ? (
          <div className="flex w-full shrink-0 items-center justify-end gap-2 border-t border-[#e4e4e7] bg-[linear-gradient(90deg,rgba(255,255,255,0.5),rgba(255,255,255,0.5)),linear-gradient(90deg,#e4e4e7,#e4e4e7)] p-3 dark:border-border dark:bg-background-muted">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
