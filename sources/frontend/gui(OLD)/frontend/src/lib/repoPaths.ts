/** Compare repository paths case-insensitively with forward slashes. */
export function repoPathsEqual(a: string, b: string): boolean {
  const norm = (path: string) => path.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  return norm(a) === norm(b);
}

export function repoPathInList(path: string, repos: string[]): boolean {
  return repos.some((candidate) => repoPathsEqual(candidate, path));
}
