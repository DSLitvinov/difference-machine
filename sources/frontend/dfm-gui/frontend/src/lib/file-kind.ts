export type FileKind = "image" | "text" | "blend" | "binary";

const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "tif", "tiff", "ico", "avif", "exr"]);
const VIDEO_EXT = new Set(["mp4", "m4v", "mov", "webm", "mkv", "avi", "mpg", "mpeg", "wmv", "flv", "ogv", "3gp"]);
const TEXT_EXT = new Set([
  "txt",
  "md",
  "markdown",
  "json",
  "csv",
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "go",
  "rs",
  "xml",
  "yml",
  "yaml",
  "toml",
  "sh",
  "bash",
  "log",
  "cfg",
  "ini",
]);

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function fileKind(name: string): FileKind {
  const ext = fileExtension(name);
  if (ext === "blend") {
    return "blend";
  }
  if (IMAGE_EXT.has(ext)) {
    return "image";
  }
  if (!ext || TEXT_EXT.has(ext)) {
    return "text";
  }
  return "binary";
}

export function isVideoFile(name: string): boolean {
  return VIDEO_EXT.has(fileExtension(name));
}

export function usesFFmpegThumbCache(name: string): boolean {
  if (fileExtension(name) === "svg") {
    return false;
  }
  return fileKind(name) === "image" || isVideoFile(name);
}

/** Full file via workdir.file for Content View (browser-native raster, SVG, ffmpeg EXR/TIFF). */
export function isRasterWorkdirImage(name: string): boolean {
  switch (fileExtension(name)) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "bmp":
    case "tif":
    case "tiff":
    case "exr":
    case "svg":
      return true;
    default:
      return false;
  }
}

export function typeLabel(name: string): string {
  const ext = fileExtension(name);
  return ext ? ext.toUpperCase() : "";
}
