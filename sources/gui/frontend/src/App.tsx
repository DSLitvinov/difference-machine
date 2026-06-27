import { useEffect } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { RepositoryAddProvider } from "@/components/shell/RepositoryAddProvider";
import { applyAppearance } from "@/lib/applyAppearance";
import { normalizeLanguage } from "@/lib/i18n";
import { useAppStore } from "@/stores/appStore";
import { fetchSettings, resolveAppearanceFromSettings, resolveExternalEditorPaths } from "@/wails/settings";

function App() {
  const setUserName = useAppStore((s) => s.setUserName);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const setExternalEditorPaths = useAppStore((s) => s.setExternalEditorPaths);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchSettings();
        setUserName(data.userName ?? "");
        const language = normalizeLanguage(data.language);
        setLanguage(language);
        document.documentElement.lang = language;
        setExternalEditorPaths(resolveExternalEditorPaths(data.editors ?? [], data.blenderPath ?? ""));
        if (localStorage.getItem("dfm.gui.theme")) return;
        const appearance = resolveAppearanceFromSettings(data);
        applyAppearance(appearance.theme, appearance.font);
      } catch {
        // Wails not ready or config missing — keep bootstrap defaults
      }
    })();
  }, [setLanguage, setUserName, setExternalEditorPaths]);

  return (
    <RepositoryAddProvider>
      <AppShell />
    </RepositoryAddProvider>
  );
}

export default App;
