"use client";

import { useEffect } from "react";

import { useTimingStore } from "@/store/useTimingStore";

/**
 * Registers window-level keyboard shortcuts for the timing workspace:
 *
 *  - `⌘=` / `Ctrl+=` / `⌘+`  zoom in (1.4× narrower)
 *  - `⌘-` / `Ctrl+-`         zoom out (1.4× wider)
 *  - `f`                     fit to default viewport
 *  - `ArrowLeft` / `ArrowRight`  nudge cursor by 1 ns
 *
 * Keystrokes whose event target is an `<input>` or `<textarea>` are ignored
 * so editable controls keep their native keybindings.
 */
export function useGlobalShortcuts(): void {
  const cursorTimeNs = useTimingStore((s) => s.cursorTimeNs);
  const tMinNs = useTimingStore((s) => s.tMinNs);
  const tMaxNs = useTimingStore((s) => s.tMaxNs);
  const setCursor = useTimingStore((s) => s.setCursor);
  const zoomAt = useTimingStore((s) => s.zoomAt);
  const fitView = useTimingStore((s) => s.fitView);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomAt((tMinNs + tMaxNs) / 2, 1 / 1.4);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoomAt((tMinNs + tMaxNs) / 2, 1.4);
      }
      if (e.key.toLowerCase() === "f") fitView();
      if (e.key === "ArrowLeft") setCursor(Math.max(tMinNs, cursorTimeNs - 1));
      if (e.key === "ArrowRight") setCursor(Math.min(tMaxNs, cursorTimeNs + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tMinNs, tMaxNs, cursorTimeNs, zoomAt, fitView, setCursor]);
}
