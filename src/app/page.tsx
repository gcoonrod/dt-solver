"use client";

import ComponentLibrary from "@/components/panels/ComponentLibrary";
import ConstraintInspector from "@/components/panels/ConstraintInspector";
import WaveformWorkspace from "@/components/features/WaveformWorkspace";
import Splitter from "@/components/ui/Splitter";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { useVerticalSplit } from "@/hooks/useVerticalSplit";

export default function Page() {
  const { bottomFrac, containerRef, startDrag } = useVerticalSplit({
    initialFrac: 0.42,
    minFrac: 0.15,
    maxFrac: 0.7,
  });
  useGlobalShortcuts();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-slate-300 select-none"
      style={{ background: "#0a0e14" }}
    >
      <ComponentLibrary />

      <div ref={containerRef} className="flex-1 flex flex-col h-full overflow-hidden">
        <div
          className="flex flex-col overflow-hidden"
          style={{ flexBasis: `${(1 - bottomFrac) * 100}%`, minHeight: 0 }}
        >
          <WaveformWorkspace />
        </div>

        <Splitter orientation="horizontal" onMouseDown={startDrag} />

        <div
          className="overflow-hidden flex-shrink-0"
          style={{ flexBasis: `${bottomFrac * 100}%`, minHeight: 0 }}
        >
          <ConstraintInspector />
        </div>
      </div>
    </div>
  );
}
