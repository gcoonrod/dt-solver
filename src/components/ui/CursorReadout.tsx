import { formatTime } from "@/components/canvas/WaveformTimeline";

export interface CursorReadoutProps {
  timeNs: number;
}

export default function CursorReadout({ timeNs }: CursorReadoutProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-[#0a0e14] border border-slate-800/80">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">
        cursor
      </span>
      <span className="text-[12px] font-mono text-amber-300">
        T: {formatTime(timeNs)}
      </span>
    </div>
  );
}
