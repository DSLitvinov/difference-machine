import { classifyHistoryDiff } from "@/lib/fileKinds";
import { basename } from "@/lib/utils";
import { BinaryDiffStub } from "@/components/preview/BinaryDiffStub";
import { DeletedDiffStub } from "@/components/preview/DeletedDiffStub";
import { ImageDiffPanel } from "@/components/preview/ImageDiffPanel";
import { LayoutToggle } from "@/components/preview/LayoutToggle";
import { TextDiffPanel } from "@/components/preview/TextDiffPanel";
import { useT } from "@/lib/i18n";
import type { HistoryImageLayout, HistoryTextLayout } from "@/lib/storage";
import type { DiffFileEntry } from "@/wails/forester";

interface DiffViewProps {
  file: DiffFileEntry | null;
  diffContent: string;
  isBinary: boolean;
  loading: boolean;
  error: string | null;
  textLayout: HistoryTextLayout;
  imageLayout: HistoryImageLayout;
  beforeImageUrl?: string | null;
  afterImageUrl?: string | null;
  imageLoading: boolean;
  imageError: string | null;
  onTextLayoutChange: (layout: HistoryTextLayout) => void;
  onImageLayoutChange: (layout: HistoryImageLayout) => void;
  onRetryText: () => void;
  onRetryImage: () => void;
  onOpenBinary: () => Promise<void>;
}

export function DiffView({
  file,
  diffContent,
  isBinary,
  loading,
  error,
  textLayout,
  imageLayout,
  beforeImageUrl,
  afterImageUrl,
  imageLoading,
  imageError,
  onTextLayoutChange,
  onImageLayoutChange,
  onRetryText,
  onRetryImage,
  onOpenBinary,
}: DiffViewProps) {
  const t = useT();
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("preview.selectFileChanges")}
      </div>
    );
  }

  const kind = classifyHistoryDiff(file.status, file.path, isBinary);
  const showTextToolbar = kind === "text";
  const showImageToolbar = kind === "image";

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {showTextToolbar || showImageToolbar ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium" title={file.path}>
            {basename(file.path)}
          </span>
          {showTextToolbar ? (
            <LayoutToggle
              value={textLayout}
              options={[
                { value: "unified", label: t("preview.layoutUnified") },
                { value: "split", label: t("preview.layoutSplit") },
              ]}
              onChange={onTextLayoutChange}
            />
          ) : null}
          {showImageToolbar ? (
            <LayoutToggle
              value={imageLayout}
              options={[
                { value: "2up", label: "2-up" },
                { value: "swipe", label: t("preview.layoutSwipe") },
                { value: "overlay", label: t("preview.layoutOverlay") },
              ]}
              onChange={onImageLayoutChange}
            />
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {kind === "deleted" ? <DeletedDiffStub path={file.path} /> : null}
        {kind === "binary" ? <BinaryDiffStub onOpen={onOpenBinary} /> : null}
        {kind === "image" ? (
          <ImageDiffPanel
            beforeUrl={beforeImageUrl}
            afterUrl={afterImageUrl}
            status={file.status}
            layout={imageLayout}
            loading={imageLoading}
            error={imageError}
            onRetry={onRetryImage}
          />
        ) : null}
        {kind === "text" ? (
          <TextDiffPanel content={diffContent} layout={textLayout} loading={loading} error={error} />
        ) : null}
      </div>
    </div>
  );
}
