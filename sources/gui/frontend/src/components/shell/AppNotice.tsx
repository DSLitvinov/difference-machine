import { useEffect } from "react";

import { useAppStore } from "@/stores/appStore";

export function AppNotice() {
  const notice = useAppStore((s) => s.notice);
  const setNotice = useAppStore((s) => s.setNotice);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice, setNotice]);

  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg">
      {notice}
    </div>
  );
}
