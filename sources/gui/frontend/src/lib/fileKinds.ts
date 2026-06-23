export type InfoPreviewKind = "image" | "text" | "binary" | "blend";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "exr", "tiff", "tif", "bmp"]);
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "json",
  "xml",
  "svg",
  "tsx",
  "ts",
  "js",
  "jsx",
  "go",
  "py",
  "rs",
  "css",
  "html",
  "yaml",
  "yml",
  "ini",
  "cfg",
  "sh",
]);

export function fileExtension(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

export type HistoryDiffKind = "text" | "image" | "binary" | "deleted";

export function classifyHistoryDiff(status: "A" | "M" | "D", path: string, isBinary?: boolean): HistoryDiffKind {
  if (status === "D") return "deleted";
  if (isBinary) return "binary";
  const ext = fileExtension(path);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "binary";
}

export function classifyInfoPreview(path: string): InfoPreviewKind {
  const ext = fileExtension(path);
  if (ext === "blend") return "blend";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "binary";
}

export function isImagePreviewPath(path: string): boolean {
  return IMAGE_EXTENSIONS.has(fileExtension(path));
}
