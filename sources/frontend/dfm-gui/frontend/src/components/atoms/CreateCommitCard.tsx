import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { t, type Locale } from "@/lib/i18n";

export type CreateCommitFields = {
  message: string;
  tag: string;
  description: string;
};

type CreateCommitCardProps = {
  locale: Locale;
  busy?: boolean;
  onCancel: () => void;
  onCreate: (fields: CreateCommitFields) => void;
};

export function CreateCommitCard({ locale, busy, onCancel, onCreate }: CreateCommitCardProps) {
  const copy = t(locale);
  const [message, setMessage] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  return (
    <div className="flex w-full flex-col gap-3" onClick={(event) => event.stopPropagation()}>
      <div className="flex w-full flex-col gap-2">
        <Textarea
          placeholder={copy.writeCommit}
          value={message}
          disabled={busy}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Textarea placeholder={copy.tagPlaceholder} value={tag} disabled={busy} onChange={(event) => setTag(event.target.value)} />
        <Textarea
          placeholder={copy.descriptionPlaceholder}
          value={description}
          disabled={busy}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="flex w-full items-start justify-end gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          {copy.cancel}
        </Button>
        <Button type="button" disabled={busy} onClick={() => onCreate({ message, tag, description })}>
          {copy.create}
        </Button>
      </div>
    </div>
  );
}
