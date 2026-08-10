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

export type FileExtensionKind =
  | "image"
  | "text"
  | "blend"
  | "mesh3d"
  | "video"
  | "audio"
  | "document"
  | "none"
  | "other";

const MESH3D_EXTENSIONS = new Set([
  "fbx",
  "obj",
  "gltf",
  "glb",
  "usd",
  "usdz",
  "abc",
  "dae",
  "stl",
  "ply",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "mkv", "webm"]);
const AUDIO_EXTENSIONS = new Set(["wav", "mp3", "ogg", "flac", "aac"]);
const DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "csv"]);

export function fileExtensionKind(ext: string): FileExtensionKind {
  if (ext === "(none)") return "none";
  if (ext === "blend") return "blend";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  if (MESH3D_EXTENSIONS.has(ext)) return "mesh3d";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (DOCUMENT_EXTENSIONS.has(ext)) return "document";
  return "other";
}

export function fileExtension(path: string): string {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return "";
  return name.slice(dot + 1).toLowerCase();
}

export type HistoryDiffKind = "text" | "image" | "binary" | "deleted";

export function classifyHistoryDiff(
  status: "A" | "M" | "D" | "R",
  path: string,
  isBinary?: boolean,
): HistoryDiffKind {
  if (status === "D") return "deleted";
  const ext = fileExtension(path);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (isBinary) return "binary";
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

/** Paths that should load workdir.thumbnail previews in the file grid. */
export function isThumbnailPreviewPath(path: string): boolean {
  const ext = fileExtension(path);
  return IMAGE_EXTENSIONS.has(ext) || ext === "blend";
}
