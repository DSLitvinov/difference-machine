import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/chrome/Icon";
import { t, type Locale } from "@/lib/i18n";

export type CreateCommitFields = {
  message: string;
  tag: string;
  description: string;
};

type CreateCommitDialogProps = {
  locale: Locale;
  busy?: boolean;
  onCancel: () => void;
  onCreate: (fields: CreateCommitFields) => void;
};

export function CreateCommitDialog({ locale, busy, onCancel, onCreate }: CreateCommitDialogProps) {
  const copy = t(locale);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [backdropArmed, setBackdropArmed] = useState(false);
  const name = message.trim();

  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-commit-title"
        className="flex w-[430px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05),0_4px_6px_-2px_rgba(0,0,0,0.05)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[52px] items-center justify-between px-4">
          <p id="create-commit-title" className="text-[18px] font-medium leading-[22px] text-[#18181b] dark:text-foreground">
            {copy.createNewCommit}
          </p>
          <button type="button" className="flex size-4 items-center justify-center" aria-label={copy.close} disabled={busy} onClick={onCancel}>
            <Icon icon={X} size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-4">
          <Input placeholder={copy.nameCommit} value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} />
          <Textarea
            placeholder={copy.descriptionHere}
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Input placeholder={copy.tagDots} value={tag} disabled={busy} onChange={(event) => setTag(event.target.value)} />
        </div>
        <div
          className="flex items-center justify-end gap-2 border-t border-border px-3 py-3"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgb(228, 228, 231) 0%, rgb(228, 228, 231) 100%)",
          }}
        >
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || name.length === 0} onClick={() => onCreate({ message: name, tag, description })}>
            {copy.create}
          </Button>
        </div>
      </div>
    </div>
  );
}
