import { useEffect, useState } from "react";
import { HeaderCommitInfo } from "@/components/items/HeaderCommitInfo";
import { CommitFileList } from "@/components/items/CommitFileList";
import { TextDiffViewer } from "@/components/items/TextDiffViewer";
import { ImageDiffViewer } from "@/components/items/ImageDiffViewer";
import { BinaryDiffStub } from "@/components/items/BinaryDiffStub";
import { fileKind } from "@/lib/file-kind";
import {
  peekBlob,
  peekNames,
  peekStat,
  peekText,
  requestBlob,
  requestNames,
  requestStat,
  requestText,
  useRevisionEpoch,
} from "@/lib/revision-cache";
import { foresterCall } from "@/lib/bridge";
import type { Locale } from "@/lib/i18n";
import type { CommitSummary } from "@/store/app-store";

type ContentCommitPanelProps = {
  locale: Locale;
  repoPath: string;
  commit: CommitSummary;
  head?: boolean;
};

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function ContentCommitPanel({ locale, repoPath, commit, head }: ContentCommitPanelProps) {
  useRevisionEpoch();
  const [path, setPath] = useState<string>("");
  const files = peekNames(repoPath, commit.hash);
  const stat = peekStat(repoPath, commit.hash);

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

  const kind = path ? fileKind(basename(path)) : "binary";
  const text = path ? peekText(repoPath, commit.hash, path) : undefined;
  const parent = commit.parent_hashes?.[0];
  const afterBlob = path ? peekBlob(repoPath, commit.hash, path) : undefined;
  const beforeBlob = path && parent ? peekBlob(repoPath, parent, path) : undefined;

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
        <CommitFileList locale={locale} files={files} selectedPath={path} onSelect={setPath} />
        {path && showBinary ? <BinaryDiffStub locale={locale} onOpen={() => void openExternal()} /> : null}
        {path && kind === "text" && text && !text.isBinary ? <TextDiffViewer locale={locale} unified={text.content} /> : null}
        {path && kind === "image" ? <ImageDiffViewer locale={locale} afterSrc={afterBlob} beforeSrc={beforeBlob} /> : null}
      </div>
    </section>
  );
}

function splitTitle(message: string): { title: string } {
  const trimmed = message.trim();
  const nl = trimmed.indexOf("\n");
  return { title: nl === -1 ? trimmed : trimmed.slice(0, nl).trim() };
}
