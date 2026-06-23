import { InfoFilePreviewTile } from "@/components/info/InfoFilePreviewTile";

interface InfoFilePreviewMultiProps {
  paths: string[];
}

export function InfoFilePreviewMulti({ paths }: InfoFilePreviewMultiProps) {
  const count = paths.length;
  const showCount = count > 3 ? 3 : count;

  return (
    <div className="mx-auto flex flex-col items-center gap-2">
      <div className="relative h-[312px] w-full max-w-[312px] rounded-md border border-border bg-muted/20">
        {showCount === 2 ? (
          <>
            <InfoFilePreviewTile
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              rotation={0}
            />
            <InfoFilePreviewTile
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              rotation={15}
              style={{ marginLeft: 24, marginTop: -8 }}
            />
          </>
        ) : null}
        {showCount >= 3 ? (
          <>
            <InfoFilePreviewTile
              className="absolute left-1/2 top-1/2"
              rotation={0}
              style={{ transform: "translate(-50%, -50%)" }}
            />
            <InfoFilePreviewTile
              className="absolute left-1/2 top-1/2"
              rotation={-15}
              style={{ transform: "translate(calc(-50% - 40px), -50%)" }}
            />
            <InfoFilePreviewTile
              className="absolute left-1/2 top-1/2"
              rotation={15}
              style={{ transform: "translate(calc(-50% + 40px), -50%)" }}
            />
          </>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{count} files selected</p>
    </div>
  );
}
