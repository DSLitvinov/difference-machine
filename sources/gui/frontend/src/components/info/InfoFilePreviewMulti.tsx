import { InfoFilePreviewTile } from "@/components/info/InfoFilePreviewTile";

interface InfoFilePreviewMultiProps {
  paths: string[];
}

export function InfoFilePreviewMulti({ paths }: InfoFilePreviewMultiProps) {
  const count = paths.length;

  return (
    <div className="mx-auto flex w-full max-w-[312px] flex-col items-center gap-2">
      <div className="relative size-[312px] shrink-0 rounded-md border border-border bg-muted/20">
        <div className="absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 p-[9px]">
          <InfoFilePreviewTile />
        </div>
        <div className="absolute left-[12.62px] top-[106.62px] z-10 flex size-[156.767px] items-center justify-center">
          <div className="-rotate-15">
            <InfoFilePreviewTile />
          </div>
        </div>
        <div className="absolute left-[140.62px] top-[106.62px] z-10 flex size-[156.767px] items-center justify-center">
          <div className="rotate-15">
            <InfoFilePreviewTile />
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {count} {count === 1 ? "file" : "files"} selected
      </p>
    </div>
  );
}
