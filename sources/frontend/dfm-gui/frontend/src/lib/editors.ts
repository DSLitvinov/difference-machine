import { useEffect, useState } from "react";
import { editorLabel } from "@/lib/folder-query";
import { getSettings, type SettingsInfo } from "@/lib/bridge";

export type ExternalEditor = {
  label: string;
  path: string;
};

type Listener = (editors: ExternalEditor[]) => void;

let cached: ExternalEditor[] = [];
const listeners = new Set<Listener>();

function publish(next: ExternalEditor[]) {
  cached = next;
  for (const listener of listeners) {
    listener(next);
  }
}

export function editorsFromSettings(info: SettingsInfo): ExternalEditor[] {
  const out: ExternalEditor[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined) => {
    const path = raw?.trim() ?? "";
    if (!path || seen.has(path)) {
      return;
    }
    seen.add(path);
    out.push({ label: editorLabel(path, info.platform), path });
  };
  add(info.blenderPath);
  for (const path of info.editors ?? []) {
    add(path);
  }
  return out;
}

export function rememberEditorsFromSettings(info: SettingsInfo): void {
  publish(editorsFromSettings(info));
}

export async function loadExternalEditors(): Promise<ExternalEditor[]> {
  try {
    const next = editorsFromSettings(await getSettings());
    publish(next);
    return next;
  } catch {
    return cached;
  }
}

export function useExternalEditors(): ExternalEditor[] {
  const [editors, setEditors] = useState(cached);
  useEffect(() => {
    const unsub = () => {
      listeners.delete(setEditors);
    };
    listeners.add(setEditors);
    setEditors(cached);
    return unsub;
  }, []);
  return editors;
}
