import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/chrome/Icon";
import { foresterCall } from "@/lib/bridge";
import { t, type Locale } from "@/lib/i18n";
import type { DirEntry } from "@/store/app-store";

type AppendFilesDialogProps = {
  locale: Locale;
  /** Paths chosen by Create commit. Non-ignored ones start in the Append column. */
  paths: string[];
  /** Ignored paths already known to be part of this commit. */
  includedIgnored?: string[];
  busy?: boolean;
  onCancel: () => void;
  onAppend: (appendPaths: string[], ignoredIncluded: string[]) => void;
};

function unique(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean))];
}

function CheckRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-11 w-full items-center gap-2 text-[14px] font-normal leading-5 text-[#18181b] dark:text-foreground">
      <Checkbox checked={checked} disabled={disabled} onChange={onChange} />
      <span className="min-w-0 truncate">{label}</span>
    </label>
  );
}

export function AppendFilesDialog({ locale, paths, includedIgnored = [], busy, onCancel, onAppend }: AppendFilesDialogProps) {
  const copy = t(locale);
  const [backdropArmed, setBackdropArmed] = useState(false);
  const [ignoredPaths, setIgnoredPaths] = useState<string[]>(() => unique(includedIgnored));
  const [appendChecked, setAppendChecked] = useState<string[]>(() => unique(paths.filter((path) => !includedIgnored.includes(path))));
  const [ignoredChecked, setIgnoredChecked] = useState<string[]>(() => unique(includedIgnored));

  useEffect(() => {
    const id = window.setTimeout(() => setBackdropArmed(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  const includedKey = includedIgnored.join("\n");
  const pathsKey = paths.join("\n");
  useEffect(() => {
    let cancelled = false;
    const seeded = includedKey ? includedKey.split("\n") : [];
    const selected = pathsKey ? pathsKey.split("\n") : [];
    void (async () => {
      try {
        const fromRepo: string[] = [];
        let offset = 0;
        const limit = 500;
        for (;;) {
          const result = (await foresterCall("workdir.entries", {
            path: "*",
            include_ignored: true,
            offset,
            limit,
          })) as { entries?: DirEntry[]; has_more?: boolean };
          if (cancelled) {
            return;
          }
          for (const entry of result.entries ?? []) {
            if (entry.ignored && !entry.is_dir && entry.path) {
              fromRepo.push(entry.path);
            }
          }
          if (!result.has_more) {
            break;
          }
          offset += limit;
        }
        if (cancelled) {
          return;
        }
        const allIgnored = unique([...fromRepo, ...seeded]);
        const ignoredSet = new Set(allIgnored);
        setIgnoredPaths(allIgnored);
        // Selected ignored paths start checked: they are included in this commit.
        setIgnoredChecked((current) => unique([...current, ...selected.filter((path) => ignoredSet.has(path))]));
      } catch {
        if (!cancelled) {
          setIgnoredPaths(unique(seeded));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [includedKey, pathsKey]);

  const appendPaths = useMemo(
    () => unique(paths.filter((path) => !ignoredPaths.includes(path))),
    [paths, ignoredPaths],
  );

  function toggle(list: string[], path: string, on: boolean): string[] {
    if (on) {
      return unique([...list, path]);
    }
    return list.filter((item) => item !== path);
  }

  const appendAll = appendPaths.length > 0 && appendPaths.every((path) => appendChecked.includes(path));
  const ignoredAll = ignoredPaths.length > 0 && ignoredPaths.every((path) => ignoredChecked.includes(path));
  const canAppend = appendChecked.length + ignoredChecked.length > 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
      role="presentation"
      onClick={busy || !backdropArmed ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="append-files-title"
        className="flex w-[780px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[52px] w-full items-center justify-between px-4">
          <p id="append-files-title" className="text-[18px] font-medium leading-[22px] text-[#18181b] dark:text-foreground">
            {copy.appendFiles}
          </p>
          <button type="button" className="flex size-4 items-center justify-center" aria-label={copy.close} disabled={busy} onClick={onCancel}>
            <Icon icon={X} size={16} />
          </button>
        </div>
        <div className="w-full p-4">
          <div className="flex w-[748px] max-w-full overflow-hidden rounded-lg border border-border">
            <div className="flex min-w-0 flex-1 flex-col border-r border-border">
              <div className="flex h-[38px] items-center border-b border-border bg-[#fafafa] px-2 text-[12px] font-normal leading-4 text-[#18181b] dark:bg-background-muted dark:text-foreground">
                {copy.appendColumn}
              </div>
              <div className="flex max-h-[360px] flex-col overflow-y-auto p-2">
                <CheckRow
                  label={copy.all}
                  checked={appendAll}
                  disabled={busy || appendPaths.length === 0}
                  onChange={(on) => setAppendChecked(on ? appendPaths : [])}
                />
                {appendPaths.map((path) => (
                  <CheckRow
                    key={path}
                    label={path}
                    checked={appendChecked.includes(path)}
                    disabled={busy}
                    onChange={(on) => setAppendChecked((current) => toggle(current, path, on))}
                  />
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex h-[38px] items-center border-b border-border bg-[#fafafa] px-2 text-[12px] font-normal leading-4 text-[#18181b] dark:bg-background-muted dark:text-foreground">
                {copy.ignored}
              </div>
              <div className="flex max-h-[360px] flex-col overflow-y-auto p-2">
                <CheckRow
                  label={copy.all}
                  checked={ignoredAll}
                  disabled={busy || ignoredPaths.length === 0}
                  onChange={(on) => setIgnoredChecked(on ? ignoredPaths : [])}
                />
                {ignoredPaths.map((path) => (
                  <CheckRow
                    key={path}
                    label={path}
                    checked={ignoredChecked.includes(path)}
                    disabled={busy}
                    onChange={(on) => setIgnoredChecked((current) => toggle(current, path, on))}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="flex w-full items-center justify-end gap-2 border-t border-border px-3 py-3"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%), linear-gradient(90deg, rgb(228, 228, 231) 0%, rgb(228, 228, 231) 100%)",
          }}
        >
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            {copy.cancel}
          </Button>
          <Button
            type="button"
            disabled={busy || !canAppend}
            onClick={() =>
              onAppend(
                appendChecked.filter((path) => appendPaths.includes(path)),
                ignoredChecked.filter((path) => ignoredPaths.includes(path)),
              )
            }
          >
            {copy.addInCommit}
          </Button>
        </div>
      </div>
    </div>
  );
}
