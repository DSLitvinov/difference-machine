/** Display label for an external editor executable path from Settings. */
export function editorDisplayLabel(absPath: string): string {
  const base = absPath.split(/[/\\]/).filter(Boolean).pop() ?? absPath;
  return base.replace(/\.(exe|app)$/i, "");
}
