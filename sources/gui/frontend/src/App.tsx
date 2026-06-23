import { useEffect } from "react";

import { AppShell } from "@/components/shell/AppShell";
import { applyAppearance } from "@/lib/applyAppearance";
import { fetchSettings, resolveAppearanceFromSettings } from "@/wails/settings";

function App() {
  useEffect(() => {
    void (async () => {
      try {
        if (localStorage.getItem("dfm.gui.theme")) return;
        const data = await fetchSettings();
        const appearance = resolveAppearanceFromSettings(data);
        applyAppearance(appearance.theme, appearance.font);
      } catch {
        // Wails not ready or config missing — keep bootstrap defaults
      }
    })();
  }, []);

  return <AppShell />;
}

export default App;
