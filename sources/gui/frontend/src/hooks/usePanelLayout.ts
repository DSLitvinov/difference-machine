import { useCallback, useEffect, useState } from "react";

import {
  INFO_MIN,
  RAIL_WIDTH,
  SIDEBAR_COLUMN_MIN,
  SIDEBAR_MAIN_MIN,
  normalizeCollapsedHistoryLayout,
  normalizeCollapsedProjectLayout,
  normalizeHistoryLayout,
  normalizeProjectLayout,
} from "@/lib/layout";
import {
  loadLayoutInfoWidth,
  loadLayoutSidebarWidth,
  saveLayoutInfoWidth,
  saveLayoutSidebarWidth,
} from "@/lib/storage";
import type { SidebarMode } from "@/stores/appStore";

function readClientWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

export function usePanelLayout(
  mode: SidebarMode,
  sidebarCollapsed: boolean,
  hideInfoPanel = false,
) {
  const [clientWidth, setClientWidth] = useState(readClientWidth);
  const [sidebarColumnWidth, setSidebarColumnWidth] = useState(
    () => loadLayoutSidebarWidth() ?? SIDEBAR_COLUMN_MIN,
  );
  const [infoWidth, setInfoWidth] = useState(() => loadLayoutInfoWidth() ?? INFO_MIN);

  useEffect(() => {
    const onResize = () => setClientWidth(readClientWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (sidebarCollapsed) {
      if (mode === "project" && !hideInfoPanel) {
        const normalized = normalizeCollapsedProjectLayout(clientWidth, infoWidth);
        if (normalized.infoWidth !== infoWidth) {
          setInfoWidth(normalized.infoWidth);
          saveLayoutInfoWidth(normalized.infoWidth);
        }
      }
      return;
    }

    if (mode === "history" || hideInfoPanel) {
      const normalized = normalizeHistoryLayout(clientWidth, sidebarColumnWidth);
      if (normalized.sidebarColumnWidth !== sidebarColumnWidth) {
        setSidebarColumnWidth(normalized.sidebarColumnWidth);
        saveLayoutSidebarWidth(normalized.sidebarColumnWidth);
      }
      return;
    }

    if (mode === "project") {
      const normalized = normalizeProjectLayout(clientWidth, sidebarColumnWidth, infoWidth);
      if (
        normalized.sidebarColumnWidth !== sidebarColumnWidth ||
        normalized.infoWidth !== infoWidth
      ) {
        setSidebarColumnWidth(normalized.sidebarColumnWidth);
        setInfoWidth(normalized.infoWidth);
        saveLayoutSidebarWidth(normalized.sidebarColumnWidth);
        saveLayoutInfoWidth(normalized.infoWidth);
      }
      return;
    }
  }, [clientWidth, mode, sidebarCollapsed, sidebarColumnWidth, infoWidth, hideInfoPanel]);

  const useHistoryWidths = mode === "history" || hideInfoPanel;

  const projectLayout =
    mode === "project" && !hideInfoPanel
      ? sidebarCollapsed
        ? normalizeCollapsedProjectLayout(clientWidth, infoWidth)
        : normalizeProjectLayout(clientWidth, sidebarColumnWidth, infoWidth)
      : null;
  const historyLayout =
    useHistoryWidths
      ? sidebarCollapsed
        ? normalizeCollapsedHistoryLayout(clientWidth)
        : normalizeHistoryLayout(clientWidth, sidebarColumnWidth)
      : null;

  const effectiveSidebarColumn = sidebarCollapsed ? RAIL_WIDTH : sidebarColumnWidth;
  const sidebarMainWidth = sidebarCollapsed
    ? 0
    : Math.max(SIDEBAR_MAIN_MIN, sidebarColumnWidth - RAIL_WIDTH);
  const previewWidth = useHistoryWidths
    ? (historyLayout?.previewWidth ?? clientWidth - effectiveSidebarColumn)
    : (projectLayout?.previewWidth ?? clientWidth - effectiveSidebarColumn - infoWidth);
  const resolvedInfoWidth =
    mode === "project" && !hideInfoPanel ? (projectLayout?.infoWidth ?? infoWidth) : infoWidth;

  const startSidebarResize = useCallback(
    (event: React.MouseEvent) => {
      if (sidebarCollapsed) return;
      event.preventDefault();
      const startX = event.clientX;
      const startSidebar = sidebarColumnWidth;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        if (mode === "project" && !hideInfoPanel) {
          const next = normalizeProjectLayout(clientWidth, startSidebar + delta, infoWidth);
          setSidebarColumnWidth(next.sidebarColumnWidth);
          saveLayoutSidebarWidth(next.sidebarColumnWidth);
          return;
        }
        const next = normalizeHistoryLayout(clientWidth, startSidebar + delta);
        setSidebarColumnWidth(next.sidebarColumnWidth);
        saveLayoutSidebarWidth(next.sidebarColumnWidth);
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clientWidth, infoWidth, mode, sidebarCollapsed, sidebarColumnWidth, hideInfoPanel],
  );

  const startInfoResize = useCallback(
    (event: React.MouseEvent) => {
      if (mode !== "project" || hideInfoPanel) return;
      event.preventDefault();
      const startX = event.clientX;
      const startInfo = infoWidth;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const next = normalizeProjectLayout(clientWidth, sidebarColumnWidth, startInfo - delta);
        setInfoWidth(next.infoWidth);
        saveLayoutInfoWidth(next.infoWidth);
        if (next.sidebarColumnWidth !== sidebarColumnWidth) {
          setSidebarColumnWidth(next.sidebarColumnWidth);
          saveLayoutSidebarWidth(next.sidebarColumnWidth);
        }
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [clientWidth, infoWidth, mode, sidebarColumnWidth, hideInfoPanel],
  );

  return {
    sidebarMainWidth,
    previewWidth,
    infoWidth: resolvedInfoWidth,
    startSidebarResize,
    startInfoResize,
    showSidebarHandle: !sidebarCollapsed,
  };
}
