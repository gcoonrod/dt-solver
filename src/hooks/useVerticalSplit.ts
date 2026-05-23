"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

export interface UseVerticalSplitArgs {
  initialFrac: number;
  minFrac: number;
  maxFrac: number;
}

export interface UseVerticalSplitResult {
  bottomFrac: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  startDrag: (e: ReactMouseEvent<HTMLDivElement>) => void;
}

/**
 * Owns the drag state machine for a top/bottom vertical split: a horizontal
 * splitter bar whose upward/downward drag grows or shrinks the bottom panel.
 *
 * The returned `containerRef` MUST be attached to the element whose height
 * defines the drag denominator; the splitter element receives `startDrag`
 * via its `onMouseDown` prop.
 */
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function useVerticalSplit({
  initialFrac,
  minFrac,
  maxFrac,
}: UseVerticalSplitArgs): UseVerticalSplitResult {
  // Store the raw value the drag math produces; return the clamped view so
  // `bottomFrac ∈ [minFrac, maxFrac]` is a render-time invariant — including
  // before any drag (out-of-range `initialFrac`) and after a bounds change.
  const [rawFrac, setRawFrac] = useState(initialFrac);
  const bottomFrac = clamp(rawFrac, minFrac, maxFrac);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    startY: number;
    startFrac: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return;
      const { startY, startFrac, h } = dragRef.current;
      setRawFrac(startFrac - (e.clientY - startY) / h);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startDrag = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    // Prefer clientHeight; fall back to getBoundingClientRect for composited
    // layers where clientHeight reports 0. Bail entirely if neither yields a
    // positive height so the drag math never divides by zero.
    const h = el.clientHeight || el.getBoundingClientRect().height;
    if (h <= 0) return;
    dragRef.current = { startY: e.clientY, startFrac: bottomFrac, h };
    e.preventDefault();
  };

  return { bottomFrac, containerRef, startDrag };
}
