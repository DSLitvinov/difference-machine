import {
  computeIntralinePair,
  plainSegments,
  type TextSegment,
} from "@/lib/intralineDiff";

export type DiffLineKind = "context" | "add" | "del" | "header";

export interface ParsedDiffLine {
  kind: DiffLineKind;
  text: string;
}

export interface UnifiedHunkRow {
  type: "hunk";
  header: string;
}

export interface UnifiedLineRow {
  type: "line";
  kind: "context" | "add" | "del";
  oldLine: number | null;
  newLine: number | null;
  prefix: "+" | "-" | " ";
  segments: TextSegment[];
}

export type UnifiedDisplayRow = UnifiedHunkRow | UnifiedLineRow;

export interface SplitHunkRow {
  type: "hunk";
  header: string;
}

export interface SplitContextRow {
  type: "context";
  oldLine: number;
  newLine: number;
  segments: TextSegment[];
}

export interface SplitModifiedRow {
  type: "modified";
  oldLine: number;
  newLine: number;
  oldSegments: TextSegment[];
  newSegments: TextSegment[];
}

export interface SplitDeletedRow {
  type: "deleted";
  oldLine: number;
  segments: TextSegment[];
}

export interface SplitAddedRow {
  type: "added";
  newLine: number;
  segments: TextSegment[];
}

export type SplitDisplayRow =
  | SplitHunkRow
  | SplitContextRow
  | SplitModifiedRow
  | SplitDeletedRow
  | SplitAddedRow;

const HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/;
const NO_NEWLINE = "\\ No newline at end of file";

function isDiffBodyLine(line: string): boolean {
  return line.startsWith("+") || line.startsWith("-") || line.startsWith(" ");
}

function isLegacyUnifiedFormat(lines: string[]): boolean {
  let sawBody = false;
  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (HUNK_RE.test(line)) return sawBody;
    if (isDiffBodyLine(line)) sawBody = true;
  }
  return false;
}

interface ParsedHunk {
  header: string;
  lines: RawHunkLine[];
}

interface RawHunkLine {
  kind: "context" | "add" | "del";
  text: string;
}

function rawLineFromDiffBody(line: string): RawHunkLine | null {
  if (line === NO_NEWLINE || line.startsWith("\\")) return null;
  if (line.startsWith("+")) return { kind: "add", text: line.slice(1) };
  if (line.startsWith("-")) return { kind: "del", text: line.slice(1) };
  if (line.startsWith(" ")) return { kind: "context", text: line.slice(1) };
  return null;
}

function parseHunks(content: string): ParsedHunk[] {
  const lines = content.split("\n");
  const hunks: ParsedHunk[] = [];

  if (isLegacyUnifiedFormat(lines)) {
    let body: string[] = [];
    for (const line of lines) {
      if (line.startsWith("---") || line.startsWith("+++")) continue;
      if (HUNK_RE.test(line)) {
        hunks.push({
          header: line,
          lines: body
            .map(rawLineFromDiffBody)
            .filter((entry): entry is RawHunkLine => entry !== null),
        });
        body = [];
        continue;
      }
      if (isDiffBodyLine(line)) body.push(line);
    }
    return hunks;
  }

  let header: string | null = null;
  let body: RawHunkLine[] = [];

  const flush = () => {
    if (!header) return;
    hunks.push({ header, lines: body });
    header = null;
    body = [];
  };

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++")) continue;
    if (HUNK_RE.test(line)) {
      flush();
      header = line;
      continue;
    }
    if (!header) continue;
    const parsed = rawLineFromDiffBody(line);
    if (parsed) body.push(parsed);
  }
  flush();
  return hunks;
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

interface NumberedLine {
  kind: "context" | "add" | "del";
  text: string;
  oldLine: number | null;
  newLine: number | null;
}

function numberHunkLines(lines: RawHunkLine[], hunkHeader: string): NumberedLine[] {
  const match = hunkHeader.match(HUNK_RE);
  if (!match) return [];

  let oldLine = Number(match[1]);
  let newLine = Number(match[3]);
  const numbered: NumberedLine[] = [];

  for (const line of lines) {
    if (line.kind === "context") {
      numbered.push({ ...line, oldLine, newLine });
      oldLine += 1;
      newLine += 1;
    } else if (line.kind === "del") {
      numbered.push({ ...line, oldLine, newLine: null });
      oldLine += 1;
    } else {
      numbered.push({ ...line, oldLine: null, newLine });
      newLine += 1;
    }
  }

  return numbered;
}

function processModifiedChunk(
  chunk: NumberedLine[],
  forSplit: boolean,
): Array<UnifiedLineRow | SplitDisplayRow> {
  const added = chunk.filter((line) => line.kind === "add");
  const deleted = chunk.filter((line) => line.kind === "del");
  const rows: Array<UnifiedLineRow | SplitDisplayRow> = [];

  const shouldHighlight =
    added.length === deleted.length && added.length > 0;

  const intralinePairs: Array<{ oldSegments: TextSegment[]; newSegments: TextSegment[] } | null> =
    [];
  if (shouldHighlight) {
    for (let i = 0; i < deleted.length; i += 1) {
      intralinePairs.push(computeIntralinePair(deleted[i].text, added[i].text));
    }
  }

  const pairs = Math.min(added.length, deleted.length);

  if (forSplit) {
    for (let i = 0; i < pairs; i += 1) {
      const del = deleted[i];
      const add = added[i];
      const segments = shouldHighlight ? intralinePairs[i] : null;
      rows.push({
        type: "modified",
        oldLine: del.oldLine ?? 0,
        newLine: add.newLine ?? 0,
        oldSegments: segments?.oldSegments ?? plainSegments(del.text),
        newSegments: segments?.newSegments ?? plainSegments(add.text),
      });
    }
    for (let i = pairs; i < deleted.length; i += 1) {
      rows.push({
        type: "deleted",
        oldLine: deleted[i].oldLine ?? 0,
        segments: plainSegments(deleted[i].text),
      });
    }
    for (let i = pairs; i < added.length; i += 1) {
      rows.push({
        type: "added",
        newLine: added[i].newLine ?? 0,
        segments: plainSegments(added[i].text),
      });
    }
    return rows;
  }

  for (let i = 0; i < pairs; i += 1) {
    const del = deleted[i];
    const add = added[i];
    const segments = shouldHighlight ? intralinePairs[i] : null;
    rows.push({
      type: "line",
      kind: "del",
      oldLine: del.oldLine,
      newLine: null,
      prefix: "-",
      segments: segments?.oldSegments ?? plainSegments(del.text),
    });
    rows.push({
      type: "line",
      kind: "add",
      oldLine: null,
      newLine: add.newLine,
      prefix: "+",
      segments: segments?.newSegments ?? plainSegments(add.text),
    });
  }
  for (let i = pairs; i < deleted.length; i += 1) {
    rows.push({
      type: "line",
      kind: "del",
      oldLine: deleted[i].oldLine,
      newLine: null,
      prefix: "-",
      segments: plainSegments(deleted[i].text),
    });
  }
  for (let i = pairs; i < added.length; i += 1) {
    rows.push({
      type: "line",
      kind: "add",
      oldLine: null,
      newLine: added[i].newLine,
      prefix: "+",
      segments: plainSegments(added[i].text),
    });
  }

  return rows;
}

function buildRowsFromHunk<T extends UnifiedDisplayRow | SplitDisplayRow>(
  hunkHeader: string,
  lines: RawHunkLine[],
  forSplit: boolean,
): T[] {
  const rows: T[] = [];
  const match = hunkHeader.match(HUNK_RE);
  if (!match) return rows;

  const suffix = match[5] ?? "";
  rows.push({
    type: "hunk",
    header: `@@ -${match[1]}${match[2] ? `,${match[2]}` : ""} +${match[3]}${match[4] ? `,${match[4]}` : ""} @@${suffix}`,
  } as T);

  const numbered = numberHunkLines(lines, hunkHeader);
  let modifiedChunk: NumberedLine[] = [];

  const flushModified = () => {
    if (modifiedChunk.length === 0) return;
    rows.push(...(processModifiedChunk(modifiedChunk, forSplit) as T[]));
    modifiedChunk = [];
  };

  for (const line of numbered) {
    if (line.kind === "add" || line.kind === "del") {
      modifiedChunk.push(line);
      continue;
    }

    flushModified();
    if (forSplit) {
      rows.push({
        type: "context",
        oldLine: line.oldLine ?? 0,
        newLine: line.newLine ?? 0,
        segments: plainSegments(line.text),
      } as T);
    } else {
      rows.push({
        type: "line",
        kind: "context",
        oldLine: line.oldLine,
        newLine: line.newLine,
        prefix: " ",
        segments: plainSegments(line.text),
      } as T);
    }
  }

  flushModified();
  return rows;
}

export function buildUnifiedDisplayRows(content: string): UnifiedDisplayRow[] {
  const hunks = parseHunks(content);
  const rows: UnifiedDisplayRow[] = [];

  for (const hunk of hunks) {
    rows.push(...buildRowsFromHunk<UnifiedDisplayRow>(hunk.header, hunk.lines, false));
  }

  return rows;
}

export function buildSplitDisplayRows(content: string): SplitDisplayRow[] {
  const hunks = parseHunks(content);
  const rows: SplitDisplayRow[] = [];

  for (const hunk of hunks) {
    rows.push(...buildRowsFromHunk<SplitDisplayRow>(hunk.header, hunk.lines, true));
  }

  return rows;
}

/** @deprecated Use buildSplitDisplayRows for GitHub-style split view. */
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
