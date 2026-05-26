"use client";

import ConstraintBuilder from "@/components/features/ConstraintBuilder";
import ProfileBar from "@/components/features/ProfileBar";
import SignalBuilder from "@/components/features/SignalBuilder";
import WaveformWorkspace from "@/components/features/WaveformWorkspace";
import ComponentLibrary from "@/components/panels/ComponentLibrary";
import ConstraintInspector from "@/components/panels/ConstraintInspector";
import Splitter from "@/components/ui/Splitter";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { usePersistence } from "@/hooks/usePersistence";
import { useVerticalSplit } from "@/hooks/useVerticalSplit";
import { useTimingStore } from "@/store/useTimingStore";

export default function Page() {
  const { bottomFrac, containerRef, startDrag } = useVerticalSplit({
    initialFrac: 0.42,
    minFrac: 0.15,
    maxFrac: 0.7,
  });
  useGlobalShortcuts();
  const { saveNow } = usePersistence();
  const isLoading = useTimingStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div
        className="flex h-screen w-screen items-center justify-center text-slate-500 text-sm"
        style={{ background: "#0a0e14" }}
      >
        Loading profile…
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden text-slate-300 select-none"
      style={{ background: "#0a0e14" }}
    >
      <ProfileBar saveNow={saveNow} />

      <div className="flex flex-1 overflow-hidden">
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

      <ConstraintBuilder />
      <SignalBuilder />
    </div>
  );
}
