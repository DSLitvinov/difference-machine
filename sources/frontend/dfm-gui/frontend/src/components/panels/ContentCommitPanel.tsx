import { useEffect, useState, type MouseEvent } from "react";
import { HeaderCommitInfo } from "@/components/items/HeaderCommitInfo";
import { CommitFileList } from "@/components/items/CommitFileList";
import { FileInCommitMenu } from "@/components/items/FileInCommitMenu";
import { TextDiffViewer } from "@/components/items/TextDiffViewer";
import { ImageDiffViewer } from "@/components/items/ImageDiffViewer";
import { BinaryDiffStub } from "@/components/items/BinaryDiffStub";
import { RestoreFileDialog } from "@/components/dialogs/RestoreFileDialog";
import { FileDeleteDialog } from "@/components/dialogs/FileDialogs";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { fileKind } from "@/lib/file-kind";
import { basenameRel } from "@/lib/folder-query";
import {
  useBlob,
  useNames,
  useStat,
  useText,
  requestBlob,
  requestNames,
  requestStat,
  requestText,
  resetRevisionCache,
  type NameStatusFile,
} from "@/lib/revision-cache";
import { foresterCall } from "@/lib/bridge";
import { t, type Locale } from "@/lib/i18n";
import { useAppStore, type CommitSummary } from "@/store/app-store";

type ContentCommitPanelProps = {
  locale: Locale;
  repoPath: string;
  commit: CommitSummary;
  head?: boolean;
  busy?: boolean;
  onRefresh?: () => Promise<void>;
};

type FileMenu = {
  path: string;
  status: string;
  x: number;
  y: number;
};

function tmpReviewRel(path: string): string {
  return `.DFM/tmp_review/${path.replace(/^\/+/, "")}`;
}

export function ContentCommitPanel({ locale, repoPath, commit, head, busy, onRefresh }: ContentCommitPanelProps) {
  const [path, setPath] = useState<string>("");
  const [menu, setMenu] = useState<FileMenu | null>(null);
  const [confirmPath, setConfirmPath] = useState<string | null>(null);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const setToast = useAppStore((s) => s.setToast);
  const openCommit = useAppStore((s) => s.openCommit);
  const copy = t(locale);
  const files = useNames(repoPath, commit.hash);
  const stat = useStat(repoPath, commit.hash);

  useEffect(() => {
    requestNames(repoPath, commit.hash);
    requestStat(repoPath, commit.hash, 0);
  }, [repoPath, commit.hash]);

  useEffect(() => {
    if (!files?.length) {
      setPath("");
      return;
    }
    setPath((current) => (current && files.some((file) => file.path === current) ? current : files[0].path));
  }, [files, commit.hash]);

  const kind = path ? fileKind(basenameRel(path)) : "binary";
  const text = useText(repoPath, commit.hash, path);
  const parent = commit.parent_hashes?.[0] ?? "";
  const afterBlob = useBlob(repoPath, commit.hash, path);
  const beforeBlob = useBlob(repoPath, parent, path);

  useEffect(() => {
    if (!path) {
      return;
    }
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

  const { title } = splitTitle(commit.message ?? "");
  const showBinary = kind === "binary" || kind === "blend" || text?.isBinary;
  const noCommits = !commit.parent_hashes?.length;

  async function openExternal() {
    if (!path) {
      return;
    }
    try {
      await foresterCall("workdir.open", { path });
    } catch {
      // File may not exist in workdir (deleted in this commit).
    }
  }

  function onFileMenu(file: NameStatusFile, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    setPath(file.path);
    setMenu({ path: file.path, status: file.status, x: event.clientX, y: event.clientY });
  }

  async function openFromCommit(relPath: string) {
    try {
      await foresterCall("compare.extract", { commit_hash: commit.hash });
      await foresterCall("workdir.open", { path: tmpReviewRel(relPath) });
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
    }
  }

  async function revertFromCommit(relPath: string): Promise<boolean> {
    try {
      await foresterCall("restore.file", { commit_hash: commit.hash, paths: [relPath] });
      await onRefresh?.();
      return true;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
      return false;
    }
  }

  async function deleteFromHistory(relPath: string): Promise<boolean> {
    try {
      const result = (await foresterCall("commit.delete_file", {
        commit_hash: commit.hash,
        path: relPath,
      })) as { hash?: string };
      resetRevisionCache();
      await onRefresh?.();
      if (result.hash) {
        openCommit(result.hash);
      }
      return true;
    } catch (err) {
      setToast(err instanceof Error ? err.message : "request failed");
      return false;
    }
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden pb-3 pl-2 pr-3">
      <HeaderCommitInfo
        locale={locale}
        title={title}
        author={commit.author ?? ""}
        hash={commit.hash}
        head={head}
        merge={(commit.parent_hashes?.length ?? 0) > 1}
        stat={stat}
      />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
        <CommitFileList
          key={commit.hash}
          locale={locale}
          files={files}
          selectedPath={path}
          onSelect={setPath}
          onFileMenu={onFileMenu}
        />
        {path && showBinary ? (
          <BinaryDiffStub
            locale={locale}
            onOpen={() => void openExternal()}
            noCommits={noCommits}
            busy={busy}
            onCompare={() => void openFromCommit(path)}
            onRevert={() => setConfirmPath(path)}
          />
        ) : null}
        {path && kind === "text" && text && !text.isBinary ? (
          <TextDiffViewer
            locale={locale}
            unified={text.content}
            noCommits={noCommits}
            busy={busy}
            onCompare={() => void openFromCommit(path)}
            onRevert={() => setConfirmPath(path)}
          />
        ) : null}
        {path && kind === "image" ? (
          <ImageDiffViewer
            locale={locale}
            afterSrc={afterBlob}
            beforeSrc={beforeBlob}
            noCommits={noCommits}
            busy={busy}
            onCompare={() => void openFromCommit(path)}
            onRevert={() => setConfirmPath(path)}
          />
        ) : null}
      </div>
      {menu ? (
        <DropdownMenu open onOpenChange={(open) => { if (!open) setMenu(null); }}>
          <DropdownMenuTrigger asChild>
            <span className="fixed z-50 size-0" style={{ left: menu.x, top: menu.y }} />
          </DropdownMenuTrigger>
          <FileInCommitMenu
            locale={locale}
            path={menu.path}
            status={menu.status}
            onOpen={() => void openFromCommit(menu.path)}
            onRevert={() => setConfirmPath(menu.path)}
            onDeleteInHistory={() => setDeletePath(menu.path)}
          />
        </DropdownMenu>
      ) : null}
      {confirmPath ? (
        <RestoreFileDialog
          locale={locale}
          fileName={basenameRel(confirmPath)}
          busy={busy}
          onCancel={() => setConfirmPath(null)}
          onConfirm={() => {
            void (async () => {
              if (await revertFromCommit(confirmPath)) {
                setConfirmPath(null);
              }
            })();
          }}
        />
      ) : null}
      {deletePath ? (
        <FileDeleteDialog
          locale={locale}
          title={copy.deleteInHistory}
          confirmLabel={copy.deleteInHistory}
          busy={busy}
          onCancel={() => setDeletePath(null)}
          onDelete={() => {
            void (async () => {
              if (await deleteFromHistory(deletePath)) {
                setDeletePath(null);
              }
            })();
          }}
        />
      ) : null}
    </section>
  );
}

function splitTitle(message: string): { title: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  return { title: nl === -1 ? trimmed : trimmed.slice(0, nl).trim() };
}
