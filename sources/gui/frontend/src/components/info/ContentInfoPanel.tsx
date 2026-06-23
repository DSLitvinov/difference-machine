import { useProjectStore } from "@/stores/projectStore";

export function ContentInfoPanel() {
  const selectedFilePath = useProjectStore((s) => s.selectedFilePath);

  if (!selectedFilePath) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">Select a file to view details</p>
      </div>
    );
  }

  const fileName = selectedFilePath.split("/").pop() ?? selectedFilePath;

  return (
    <div className="flex h-full flex-col p-4">
      <header className="border-b border-border pb-3">
        <h2 className="text-sm font-semibold">File details</h2>
        <p className="mt-1 truncate text-sm text-muted-foreground" title={selectedFilePath}>
          {fileName}
        </p>
      </header>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Metadata and history — coming in slice 3</p>
      </div>
    </div>
  );
}
