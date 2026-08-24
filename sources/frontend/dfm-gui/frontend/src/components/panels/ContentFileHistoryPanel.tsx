import { useEffect, useState } from "react";
import { HeaderFileCommitAction } from "@/components/items/HeaderFileCommitAction";
import { TextDiffViewer } from "@/components/items/TextDiffViewer";
import { ImageDiffViewer } from "@/components/items/ImageDiffViewer";
import { BinaryDiffStub } from "@/components/items/BinaryDiffStub";
import { RestoreFileDialog } from "@/components/dialogs/RestoreFileDialog";
import { fileKind } from "@/lib/file-kind";
import {
  useBlob,
  useText,
  requestBlob,
  requestText,
} from "@/lib/revision-cache";
import type { Locale } from "@/lib/i18n";
import type { CommitSummary } from "@/store/app-store";

type ContentFileHistoryPanelProps = {
  locale: Locale;
  repoPath: string;
  path: string;
  commit: CommitSummary;
  busy?: boolean;
  onBack: () => void;
  onCompare: () => void;
  onRevert: () => Promise<boolean>;
  onOpenExternal: () => void;
};

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function ContentFileHistoryPanel({
  locale,
  repoPath,
  path,
  commit,
  busy,
  onBack,
  onCompare,
  onRevert,
  onOpenExternal,
}: ContentFileHistoryPanelProps) {
  const [confirm, setConfirm] = useState(false);
  const name = basename(path);
  const kind = fileKind(name);
  const parent = commit.parent_hashes?.[0] ?? "";
  const text = useText(repoPath, commit.hash, path);
  const afterBlob = useBlob(repoPath, commit.hash, path);
  const beforeBlob = useBlob(repoPath, parent, path);

  useEffect(() => {
    if (kind === "image") {
      requestBlob(repoPath, commit.hash, path);
      if (parent) {
        requestBlob(repoPath, parent, path);
      }
      return;
    }
    if (kind === "text") {
      requestText(repoPath, commit.hash, path);
    }
  }, [repoPath, commit.hash, path, kind, parent]);

  const showBinary = kind === "binary" || kind === "blend" || text?.isBinary;
  const noCommits = !commit.parent_hashes?.length;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderFileCommitAction
        locale={locale}
        fileName={name}
        busy={busy}
        onBack={onBack}
        onCompare={onCompare}
        onRevert={() => setConfirm(true)}
      />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        {showBinary ? <BinaryDiffStub locale={locale} onOpen={onOpenExternal} /> : null}
        {kind === "text" && !showBinary ? (
          <TextDiffViewer locale={locale} unified={text?.content ?? ""} noCommits={noCommits} />
        ) : null}
        {kind === "image" ? (
          <ImageDiffViewer locale={locale} afterSrc={afterBlob} beforeSrc={beforeBlob} noCommits={noCommits} />
        ) : null}
      </div>
      {confirm ? (
        <RestoreFileDialog
          locale={locale}
          fileName={name}
          busy={busy}
          onCancel={() => setConfirm(false)}
          onConfirm={() => {
            void (async () => {
              if (await onRevert()) {
                setConfirm(false);
              }
            })();
          }}
        />
      ) : null}
    </section>
  );
}
