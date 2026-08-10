export function parseCommitMessage(message: string) {
  const parts = message.split(/\n\n+/);
  const head = parts[0] ?? "";
  return {
    title: head.split("\n")[0]?.trim() || "(no message)",
    description: parts[1]?.trim() ?? null,
  };
}
