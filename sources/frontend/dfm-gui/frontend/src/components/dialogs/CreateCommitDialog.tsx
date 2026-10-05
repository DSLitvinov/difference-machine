import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const name = message.trim();

  return (
    <Dialog
      className="w-[430px]"
      title={copy.createNewCommit}
      titleId="create-commit-title"
      closeLabel={copy.close}
      busy={busy}
      onClose={onCancel}
      footer={
        <>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button type="button" disabled={busy || name.length === 0} onClick={() => onCreate({ message: name, tag, description })}>
            {copy.create}
          </Button>
        </>
      }
    >
      <Input placeholder={copy.nameCommit} value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} />
      <Textarea
        placeholder={copy.descriptionHere}
        value={description}
        disabled={busy}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Input placeholder={copy.tagDots} value={tag} disabled={busy} onChange={(event) => setTag(event.target.value)} />
    </Dialog>
  );
}
