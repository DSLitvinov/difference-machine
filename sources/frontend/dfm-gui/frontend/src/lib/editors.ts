import { editorLabel } from "@/lib/folder-query";
import { getSettings, type SettingsInfo } from "@/lib/bridge";

export type ExternalEditor = {
  label: string;
  path: string;
};

export function editorsFromSettings(info: SettingsInfo): ExternalEditor[] {
  const out: ExternalEditor[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined) => {
    const path = raw?.trim() ?? "";
    if (!path || seen.has(path)) {
      return;
    }
    seen.add(path);
    out.push({ label: editorLabel(path), path });
  };
  add(info.blenderPath);
  for (const path of info.editors ?? []) {
    add(path);
  }
  return out;
}

export async function loadExternalEditors(): Promise<ExternalEditor[]> {
  try {
    return editorsFromSettings(await getSettings());
  } catch {
    return [];
  }
}
