export function authorDisplayName(formatted: string): string {
  const trimmed = formatted.trim();
  const lt = trimmed.lastIndexOf("<");
  const gt = trimmed.lastIndexOf(">");
  if (lt >= 0 && gt > lt) {
    return trimmed.slice(0, lt).trim();
  }
  return trimmed;
}

export function formatAuthor(name: string, email: string): string {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (trimmedName && trimmedEmail) {
    return `${trimmedName} <${trimmedEmail}>`;
  }
  if (trimmedEmail) {
    return `<${trimmedEmail}>`;
  }
  return trimmedName;
}
