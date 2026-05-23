"use client";

import { formatTime } from "@/components/canvas/WaveformTimeline";
import { formatSignalDisplay } from "@/components/features/signalDisplay";
import CursorReadout from "@/components/ui/CursorReadout";
import SignalStateBadge from "@/components/ui/SignalStateBadge";
import ToolBtn from "@/components/ui/ToolBtn";
import { useTimingStore } from "@/store/useTimingStore";

export default function WaveformToolbar() {
  const tMinNs = useTimingStore((s) => s.tMinNs);
  const tMaxNs = useTimingStore((s) => s.tMaxNs);
  const cursorTimeNs = useTimingStore((s) => s.cursorTimeNs);
  const signals = useTimingStore((s) => s.signals);
  const zoomAt = useTimingStore((s) => s.zoomAt);
  const fitView = useTimingStore((s) => s.fitView);
  const center = (tMinNs + tMaxNs) / 2;

  return (
    <div className="flex items-center justify-between px-3 h-10 border-b border-slate-800/80 bg-[#0d1117]/90 flex-shrink-0">
      <div className="flex items-center gap-1">
        <ToolBtn
          icon="zoom-in"
          label="Zoom In"
          kbd="⌘+"
          onClick={() => zoomAt(center, 1 / 1.4)}
        />
        <ToolBtn
          icon="zoom-out"
          label="Zoom Out"
          kbd="⌘-"
          onClick={() => zoomAt(center, 1.4)}
        />
        <ToolBtn icon="maximize" label="Fit" kbd="F" onClick={fitView} />
        <div className="w-px h-4 bg-slate-800 mx-1" />
        <span className="text-[10.5px] font-mono text-slate-500 tracking-tight">
          {formatTime(tMinNs)} – {formatTime(tMaxNs)}
        </span>
        <span className="text-[10.5px] font-mono text-slate-600 ml-2">
          · {formatTime(tMaxNs - tMinNs)} span
        </span>
      </div>

      <div className="flex items-center gap-3">
        <CursorReadout timeNs={cursorTimeNs} />
        <div className="flex items-center gap-1.5">
          {signals.slice(0, 4).map((sig) => (
            <SignalStateBadge
              key={sig.id}
              color={sig.color ?? "#94a3b8"}
              display={formatSignalDisplay(sig, cursorTimeNs)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
