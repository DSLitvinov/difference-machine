import { Switch } from "@/components/ui/switch";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type UncommittedFilesCardProps = {
  locale: Locale;
  dirty: boolean;
  changedOnly: boolean;
  onChangedOnly: (value: boolean) => void;
};

export function UncommittedFilesCard({ locale, dirty, changedOnly, onChangedOnly }: UncommittedFilesCardProps) {
  const copy = t(locale);
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-1">
        <p className={cn("min-w-0 flex-1 text-[14px] font-semibold leading-5", dirty ? "text-foreground" : "text-foreground-muted")}>
          {copy.uncommittedFiles}
        </p>
        <label className={cn("flex items-center gap-2", dirty ? "opacity-100" : "opacity-50")}>
          <Switch checked={changedOnly} onCheckedChange={onChangedOnly} disabled={!dirty} />
          <span className="text-[14px] leading-5 text-foreground">{copy.changed}</span>
        </label>
      </div>
      <p className="truncate text-[12px] leading-4 text-foreground-muted">{copy.noChangedFiles}</p>
      <button
        type="button"
        disabled
        className="flex h-10 w-full items-center justify-center rounded-md border border-border text-[14px] font-medium leading-5 text-foreground opacity-50"
      >
        {copy.commitAllFiles}
      </button>
    </div>
  );
}
