export type DiffLineKind = "context" | "add" | "del" | "header";

export interface ParsedDiffLine {
  kind: DiffLineKind;
  text: string;
}

export function parseUnifiedDiff(content: string): ParsedDiffLine[] {
  return content.split("\n").map((line) => {
    if (line.startsWith("@@") || line.startsWith("---") || line.startsWith("+++")) {
      return { kind: "header" as const, text: line };
    }
    if (line.startsWith("+")) {
      return { kind: "add" as const, text: line.slice(1) };
    }
    if (line.startsWith("-")) {
      return { kind: "del" as const, text: line.slice(1) };
    }
    return { kind: "context" as const, text: line.startsWith(" ") ? line.slice(1) : line };
  });
}

export function toSplitColumns(lines: ParsedDiffLine[]): { left: string[]; right: string[] } {
  const left: string[] = [];
  const right: string[] = [];
  for (const line of lines) {
    if (line.kind === "header") {
      left.push(line.text);
      right.push(line.text);
      continue;
    }
    if (line.kind === "del") {
      left.push(line.text);
      right.push("");
      continue;
    }
    if (line.kind === "add") {
      left.push("");
      right.push(line.text);
      continue;
    }
    left.push(line.text);
    right.push(line.text);
  }
  return { left, right };
}
