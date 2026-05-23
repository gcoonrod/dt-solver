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
export function useVerticalSplit({
  initialFrac,
  minFrac,
  maxFrac,
}: UseVerticalSplitArgs): UseVerticalSplitResult {
  const [bottomFrac, setBottomFrac] = useState(initialFrac);
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
      const next = Math.max(
        minFrac,
        Math.min(maxFrac, startFrac - (e.clientY - startY) / h),
      );
      setBottomFrac(next);
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
  }, [minFrac, maxFrac]);

  const startDrag = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    dragRef.current = {
      startY: e.clientY,
      startFrac: bottomFrac,
      h: containerRef.current.clientHeight,
    };
    e.preventDefault();
  };

  return { bottomFrac, containerRef, startDrag };
}
