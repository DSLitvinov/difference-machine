import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SettingsPathListRowProps {
  path: string;
  onSelect: () => void;
  onRemove: () => void;
  className?: string;
}

export function SettingsPathListRow({ path, onSelect, onRemove, className }: SettingsPathListRowProps) {
  const t = useT();
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Input value={path} readOnly className="min-w-0 flex-1 font-mono text-xs" title={path} />
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onSelect}>
        {t("common.select")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 text-destructive hover:text-destructive"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface SettingsLabeledPathRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: () => void;
  onClear?: () => void;
  optional?: boolean;
  className?: string;
}

export function SettingsLabeledPathRow({
  label,
  value,
  onChange,
  onSelect,
  onClear,
  optional,
  className,
}: SettingsLabeledPathRowProps) {
  const t = useT();
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">
        {label}
        {optional ? (
          <span className="ml-1 font-normal text-muted-foreground">({t("common.optional")})</span>
        ) : null}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          value={value}
          placeholder={t("common.selectPath")}
          className="min-w-0 flex-1 font-mono text-xs"
          title={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onSelect}>
          {t("common.select")}
        </Button>
        {optional && onClear ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-destructive hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
