import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  CreateCommitDialog,
  prepareCommitPaths,
} from "@/components/info/CreateCommitDialog";
import { InfoFilePreviewMulti } from "@/components/info/InfoFilePreviewMulti";
import { InfoFilePreviewSingle } from "@/components/info/InfoFilePreviewSingle";
import {
  InfoMetadataSection,
  metadataFromWorkdir,
  type FileMetadata,
} from "@/components/info/InfoMetadataSection";
import { InfoEditInButton } from "@/components/info/InfoEditInButton";
import { InfoHistorySection } from "@/components/info/InfoHistorySection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyInfoPreview } from "@/lib/fileKinds";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { fetchRepoUser } from "@/wails/bridge";
import {
  fetchStatus,
  fetchLockList,
  fetchFileLog,
  fetchWorkdirMetadata,
  indexAddFiles,
  type StatusPayload,
  vcsFileStatus,
} from "@/wails/forester";

export function ContentInfoPanel() {
  const t = useT();
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const selectedFilePaths = useProjectStore((s) => s.selectedFilePaths);
  const status = useProjectStore((s) => s.status);
  const committable = useProjectStore((s) => s.committable);
  const workdirGeneration = useProjectStore((s) => s.workdirGeneration);
  const projectPreviewMode = useProjectStore((s) => s.projectPreviewMode);
  const currentBranch = useAppStore((s) => s.currentBranch);

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [author, setAuthor] = useState("");
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitPaths, setCommitPaths] = useState<string[]>([]);
  const [metadataKey, setMetadataKey] = useState(0);
  const [fileCommitCount, setFileCommitCount] = useState<number | null>(null);

  const isMulti = selectedFilePaths.length > 1;
  const selectedFilePath = selectedFilePaths.length === 1 ? selectedFilePaths[0]! : null;

  useEffect(() => {
    void fetchRepoUser()
      .then(setAuthor)
      .catch(() => setAuthor(""));
  }, []);

  useEffect(() => {
    if (!selectedFilePath || isMulti) {
      setMetadata(null);
      setFileCommitCount(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setFileCommitCount(null);
      try {
        const branch = currentBranch ?? "main";
        const [meta, locks, fileLog] = await Promise.all([
          fetchWorkdirMetadata(selectedFilePath),
          fetchLockList(),
          fetchFileLog(branch, selectedFilePath, 500),
        ]);
        if (cancelled) return;
        const lock = locks.find((entry) => entry.file_path === selectedFilePath);
        const commits = fileLog.commits ?? [];
        setFileCommitCount(commits.length);
        const editor = commits[0]?.author;
        const creator = commits.length > 0 ? commits[commits.length - 1]?.author : undefined;
        setMetadata(
          metadataFromWorkdir(selectedFilePath, meta, {
            lockedBy: lock?.user,
            editor,
            creator,
          }),
        );
      } catch (err) {
        if (!cancelled) {
          setMetadata(null);
          setFileCommitCount(null);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedFilePath, isMulti, setError, metadataKey, currentBranch, workdirGeneration]);

  if (selectedFilePaths.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("info.selectFile")}</p>
      </div>
    );
  }

  if (isMulti) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex-1 space-y-4 overflow-auto p-4">
          <InfoFilePreviewMulti paths={selectedFilePaths} />
        </div>
        <footer className="border-t border-border p-4">
          <Button
            className="w-full"
            onClick={() =>
              void openCreateCommit(
                selectedFilePaths,
                committable,
                setError,
                setNotice,
                setCommitPaths,
                setCommitOpen,
                t,
              )
            }
          >
            {t("commit.create")}
          </Button>
        </footer>
        <CreateCommitDialog
          open={commitOpen}
          onOpenChange={setCommitOpen}
          author={author}
          selectedPaths={commitPaths}
        />
      </div>
    );
  }

  const fileName = selectedFilePath!.split("/").pop() ?? selectedFilePath!;
  const vcsStatus = vcsFileStatus(selectedFilePath!, status);
  const kind = classifyInfoPreview(selectedFilePath!);
  const lockUser = metadata?.lockedBy ?? null;
  const fileDeleted =
    vcsStatus === "deleted" || vcsStatus === "staged-deleted";
  const showEditIn = projectPreviewMode === "fileViewer";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <InfoFilePreviewSingle
          path={selectedFilePath!}
          vcsStatus={vcsStatus}
          lockUser={lockUser}
          kind={kind}
          loading={loading}
        />

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">{t("info.nameFile")}</label>
          <Input value={fileName} disabled title={selectedFilePath!} />
        </div>

        {showEditIn ? (
          <InfoEditInButton
            filePath={selectedFilePath!}
            disabled={fileDeleted || Boolean(lockUser)}
          />
        ) : null}

        <InfoHistorySection
          filePath={selectedFilePath!}
          commitCount={fileCommitCount}
          historyLoading={loading}
        />

        <InfoMetadataSection metadata={metadata} loading={loading} />
      </div>

      <footer className="border-t border-border p-4">
        <Button
          className="w-full"
          disabled={loading}
          onClick={() =>
            void openCreateCommit(
              [selectedFilePath!],
              committable,
              setError,
              setNotice,
              setCommitPaths,
              setCommitOpen,
              t,
            )
          }
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {t("commit.create")}
        </Button>
      </footer>

      <CreateCommitDialog
        open={commitOpen}
        onOpenChange={setCommitOpen}
        author={author}
        selectedPaths={commitPaths}
      />
    </div>
  );
}

async function openCreateCommit(
  paths: string[],
  committable: string[],
  setError: (error: string | null) => void,
  setNotice: (notice: string | null) => void,
  setCommitPaths: (paths: string[]) => void,
  setCommitOpen: (open: boolean) => void,
  t: ReturnType<typeof useT>,
) {
  const { toStage, error, warning } = prepareCommitPaths(paths, committable, t);
  if (error) {
    setError(error);
    return;
  }
  if (warning) setNotice(warning);
  try {
    const status = await fetchStatus();
    const stagedOutsideSelection = stagedPaths(status).filter((path) => !toStage.includes(path));
    if (stagedOutsideSelection.length > 0) {
      setError(t("commit.stagedOutsideSelection", { count: stagedOutsideSelection.length }));
      return;
    }
    await indexAddFiles(toStage);
    setCommitPaths(toStage);
    setCommitOpen(true);
  } catch (err) {
    setError(err instanceof Error ? err.message : String(err));
  }
}

function stagedPaths(status: StatusPayload): string[] {
  const out = new Set<string>();
  for (const list of [
    status.staged_new_files,
    status.staged_modified_files,
    status.staged_deleted_files,
  ]) {
    for (const path of list ?? []) out.add(path);
  }
  for (const entry of status.renamed_files ?? []) {
    if (entry.path) out.add(entry.path);
  }
  return [...out];
}
