import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  CreateCommitDialog,
  prepareCommitPaths,
} from "@/components/info/CreateCommitDialog";
import { InfoFilePreviewSingle } from "@/components/info/InfoFilePreviewSingle";
import {
  InfoMetadataSection,
  metadataFromWorkdir,
  type FileMetadata,
} from "@/components/info/InfoMetadataSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { classifyInfoPreview } from "@/lib/fileKinds";
import { useAppStore } from "@/stores/appStore";
import { useProjectStore } from "@/stores/projectStore";
import { fetchRepoUser } from "@/wails/bridge";
import {
  fetchLockList,
  fetchWorkdirMetadata,
  indexAddFiles,
  vcsFileStatus,
} from "@/wails/forester";

export function ContentInfoPanel() {
  const setNotice = useAppStore((s) => s.setNotice);
  const setError = useAppStore((s) => s.setError);
  const selectedFilePath = useProjectStore((s) => s.selectedFilePath);
  const status = useProjectStore((s) => s.status);
  const committable = useProjectStore((s) => s.committable);

  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [author, setAuthor] = useState("");
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitPaths, setCommitPaths] = useState<string[]>([]);

  useEffect(() => {
    void fetchRepoUser()
      .then(setAuthor)
      .catch(() => setAuthor(""));
  }, []);

  useEffect(() => {
    if (!selectedFilePath) {
      setMetadata(null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [meta, locks] = await Promise.all([
          fetchWorkdirMetadata(selectedFilePath),
          fetchLockList(),
        ]);
        if (cancelled) return;
        const lock = locks.find((entry) => entry.file_path === selectedFilePath);
        setMetadata(
          metadataFromWorkdir(selectedFilePath, meta, lock?.user),
        );
      } catch (err) {
        if (!cancelled) {
          setMetadata(null);
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
  }, [selectedFilePath, setError]);

  if (!selectedFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Select a file to view details</p>
      </div>
    );
  }

  const fileName = selectedFilePath.split("/").pop() ?? selectedFilePath;
  const vcsStatus = vcsFileStatus(selectedFilePath, status);
  const kind = classifyInfoPreview(selectedFilePath);
  const lockUser = metadata?.lockedBy ?? null;

  const openCreateCommit = async () => {
    const { toStage, error, warning } = prepareCommitPaths([selectedFilePath], committable);
    if (error) {
      setError(error);
      return;
    }
    if (warning) setNotice(warning);
    try {
      await indexAddFiles(toStage);
      setCommitPaths(toStage);
      setCommitOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-auto p-4">
        <InfoFilePreviewSingle
          path={selectedFilePath}
          vcsStatus={vcsStatus}
          lockUser={lockUser}
          kind={kind}
          loading={loading}
        />

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">name file</label>
          <Input value={fileName} disabled title={selectedFilePath} />
        </div>

        <InfoMetadataSection metadata={metadata} loading={loading} />
      </div>

      <footer className="border-t border-border p-4">
        <Button className="w-full" onClick={() => void openCreateCommit()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create commit
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
