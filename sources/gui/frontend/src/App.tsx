import { useEffect } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { RepositoryAddProvider } from "@/components/shell/RepositoryAddProvider";
import { applyAppearance } from "@/lib/applyAppearance";
import { useAppStore } from "@/stores/appStore";
import { fetchSettings, resolveAppearanceFromSettings } from "@/wails/settings";

function App() {
  const setUserName = useAppStore((s) => s.setUserName);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchSettings();
        setUserName(data.userName ?? "");
        if (localStorage.getItem("dfm.gui.theme")) return;
        const appearance = resolveAppearanceFromSettings(data);
        applyAppearance(appearance.theme, appearance.font);
      } catch {
        // Wails not ready or config missing — keep bootstrap defaults
      }
    })();
  }, [setUserName]);

  return (
    <RepositoryAddProvider>
      <AppShell />
    </RepositoryAddProvider>
  );
}

export default App;
