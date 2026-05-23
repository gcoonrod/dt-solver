"use client";

import { HEADER_H, ROW_H } from "@/components/canvas/WaveformTimeline";
import { formatChannelLabelDisplay } from "@/components/features/signalDisplay";
import { useTimingStore } from "@/store/useTimingStore";

export default function ChannelLabels() {
  const signals = useTimingStore((s) => s.signals);
  const cursorTimeNs = useTimingStore((s) => s.cursorTimeNs);

  return (
    <div
      className="flex flex-col flex-shrink-0 border-r border-slate-800/80"
      style={{ width: 142, background: "#0d1117" }}
    >
      <div
        style={{ height: HEADER_H }}
        className="border-b border-slate-800/40 flex items-end px-2 pb-1"
      >
        <span className="text-[9.5px] uppercase tracking-widest text-slate-600">
          channel
        </span>
      </div>
      {signals.map((sig) => {
        const display = formatChannelLabelDisplay(sig, cursorTimeNs);
        return (
          <div
            key={sig.id}
            style={{ height: ROW_H }}
            className="flex items-center px-2.5 gap-2 border-b border-slate-900/60"
          >
            <span
              className="w-1 h-5 rounded-sm flex-shrink-0"
              style={{ background: sig.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-mono text-slate-200 truncate leading-tight">
                {sig.name}
              </div>
              <div className="text-[9.5px] text-slate-500 truncate font-mono uppercase tracking-wider">
                {sig.type.toLowerCase()}
              </div>
            </div>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800/80"
              style={{ color: sig.color }}
            >
              {display}
            </span>
          </div>
        );
      })}
    </div>
  );
}
