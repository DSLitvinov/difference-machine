export type UnifiedRowType = "added" | "deleted" | "default";

export type UnifiedRow = {
  type: UnifiedRowType;
  oldNo: number | null;
  newNo: number | null;
  text: string;
};

export function parseUnified(content: string): UnifiedRow[] {
  const rows: UnifiedRow[] = [];
  let oldNo = 0;
  let newNo = 0;
  for (const line of content.split("\n")) {
    if (line.startsWith("---") || line.startsWith("+++")) {
      continue;
    }
    if (line.startsWith("@@")) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(line);
      if (match) {
        oldNo = Number(match[1]);
        newNo = Number(match[2]);
      }
      continue;
    }
    if (line.startsWith("+")) {
      rows.push({ type: "added", oldNo: null, newNo, text: line.slice(1) });
      newNo += 1;
      continue;
    }
    if (line.startsWith("-")) {
      rows.push({ type: "deleted", oldNo, newNo: null, text: line.slice(1) });
      oldNo += 1;
      continue;
    }
    const text = line.startsWith(" ") ? line.slice(1) : line;
    if (oldNo === 0 && newNo === 0 && text === "" && rows.length === 0) {
      continue;
    }
    rows.push({ type: "default", oldNo: oldNo || null, newNo: newNo || null, text });
    if (oldNo) {
      oldNo += 1;
    }
    if (newNo) {
      newNo += 1;
    }
  }
  return rows;
}
