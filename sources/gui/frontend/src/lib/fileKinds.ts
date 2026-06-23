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

export function classifyInfoPreview(path: string): InfoPreviewKind {
  const ext = fileExtension(path);
  if (ext === "blend") return "blend";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "binary";
}
