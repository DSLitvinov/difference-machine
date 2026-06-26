export function isEditableElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function isSelectAllShortcut(event: KeyboardEvent): boolean {
  const isAKey = event.code === "KeyA" || event.key.toLowerCase() === "a";
  return isAKey && (event.ctrlKey || event.metaKey) && !event.altKey;
}
