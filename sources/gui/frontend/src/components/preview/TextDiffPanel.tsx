interface TextDiffPanelProps {
  content: string;
  loading: boolean;
  error: string | null;
}

function diffLineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
    return "text-muted-foreground";
  }
  if (line.startsWith("+")) return "bg-emerald-50 text-emerald-900";
  if (line.startsWith("-")) return "bg-red-50 text-red-900";
  return "";
}

export function TextDiffPanel({ content, loading, error }: TextDiffPanelProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading diff…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }
  const lines = content.split("\n");
  return (
    <div className="h-full overflow-auto bg-background p-3 font-mono text-xs">
      {lines.map((line, index) => (
        <div key={`${index}-${line.slice(0, 8)}`} className={`whitespace-pre-wrap px-1 ${diffLineClass(line)}`}>
          {line || " "}
        </div>
      ))}
    </div>
  );
}
