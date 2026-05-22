"use client";

import { useEffect, useRef, useState } from "react";

import ComponentLibrary from "@/components/panels/ComponentLibrary";
import ConstraintInspector from "@/components/panels/ConstraintInspector";
import WaveformTimeline, {
  HEADER_H,
  ROW_H,
  formatTime,
} from "@/components/canvas/WaveformTimeline";
import { stateAt } from "@/core/solver";
import { useTimingStore } from "@/store/useTimingStore";

export default function Page() {
  const cursorTimeNs = useTimingStore((s) => s.cursorTimeNs);
  const tMinNs = useTimingStore((s) => s.tMinNs);
  const tMaxNs = useTimingStore((s) => s.tMaxNs);
  const setCursor = useTimingStore((s) => s.setCursor);
  const zoomAt = useTimingStore((s) => s.zoomAt);
  const fitView = useTimingStore((s) => s.fitView);

  // bottom-panel split
  const [bottomFrac, setBottomFrac] = useState(0.42);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startFrac: number; h: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const { startY, startFrac, h } = dragRef.current;
      const next = Math.max(0.15, Math.min(0.7, startFrac - (e.clientY - startY) / h));
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
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
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

  const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rightRef.current) return;
    dragRef.current = {
      startY: e.clientY,
      startFrac: bottomFrac,
      h: rightRef.current.clientHeight,
    };
    e.preventDefault();
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden text-slate-300 select-none"
      style={{ background: "#0a0e14" }}
    >
      <ComponentLibrary />

      <div ref={rightRef} className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top: canvas */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ flexBasis: `${(1 - bottomFrac) * 100}%`, minHeight: 0 }}
        >
          <WaveformToolbar />
          <div className="flex-1 flex overflow-hidden">
            <ChannelLabels />
            <div className="flex-1 relative overflow-hidden">
              <WaveformTimeline />
              <CornerLabel />
            </div>
          </div>
        </div>

        {/* Splitter */}
        <div
          onMouseDown={startDrag}
          className="h-[5px] bg-[#0a0e14] hover:bg-slate-700 cursor-row-resize border-t border-b border-slate-800/80 flex-shrink-0 relative group"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-700/40 group-hover:bg-slate-500/60" />
        </div>

        {/* Bottom: inspector */}
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

// ==========================================================================
// Waveform toolbar
// ==========================================================================
function WaveformToolbar() {
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
        <ToolBtn icon="zoom-in" label="Zoom In" kbd="⌘+" onClick={() => zoomAt(center, 1 / 1.4)} />
        <ToolBtn icon="zoom-out" label="Zoom Out" kbd="⌘-" onClick={() => zoomAt(center, 1.4)} />
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
        <div className="flex items-center gap-2 px-2 py-1 rounded-sm bg-[#0a0e14] border border-slate-800/80">
          <span className="text-[10px] uppercase tracking-widest text-slate-500">cursor</span>
          <span className="text-[12px] font-mono text-amber-300">
            T: {formatTime(cursorTimeNs)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {signals.slice(0, 4).map((sig) => {
            const s = stateAt(sig, cursorTimeNs);
            const display =
              sig.type === "CLOCK"
                ? s.state === "HIGH"
                  ? "1"
                  : "0"
                : s.value ||
                  (s.state === "HIGH"
                    ? "1"
                    : s.state === "LOW"
                      ? "0"
                      : s.state === "HIGH_Z"
                        ? "Z"
                        : s.state.charAt(0));
            return (
              <div
                key={sig.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800/60"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sig.color }} />
                <span className="text-[10px] font-mono text-slate-300">{display}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Toolbar button (extra icons not in IconCL)
// ==========================================================================
type ToolBtnIcon = "zoom-in" | "zoom-out" | "maximize";

interface ToolBtnProps {
  icon: ToolBtnIcon;
  label: string;
  kbd?: string;
  onClick?: () => void;
}

const TOOL_BTN_PATHS: Record<ToolBtnIcon, React.ReactNode> = {
  "zoom-in": (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
    </g>
  ),
  "zoom-out": (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </g>
  ),
  maximize: <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />,
};

function ToolBtn({ icon, label, kbd, onClick }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `${label} (${kbd})` : label}
      className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-sm"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {TOOL_BTN_PATHS[icon]}
      </svg>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}

// ==========================================================================
// Channel-labels strip (left of canvas)
// ==========================================================================
function ChannelLabels() {
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
        <span className="text-[9.5px] uppercase tracking-widest text-slate-600">channel</span>
      </div>
      {signals.map((sig) => {
        const s = stateAt(sig, cursorTimeNs);
        const display =
          sig.type === "CLOCK"
            ? s.state === "HIGH"
              ? "HIGH"
              : "LOW"
            : s.value
              ? s.value
              : s.state === "HIGH"
                ? "1"
                : s.state === "LOW"
                  ? "0"
                  : s.state === "HIGH_Z"
                    ? "HiZ"
                    : s.state.charAt(0);
        return (
          <div
            key={sig.id}
            style={{ height: ROW_H }}
            className="flex items-center px-2.5 gap-2 border-b border-slate-900/60"
          >
            <span className="w-1 h-5 rounded-sm flex-shrink-0" style={{ background: sig.color }} />
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

function CornerLabel() {
  return (
    <div className="absolute top-1.5 right-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-[#0a0e14]/90 border border-slate-800/60 text-[9.5px] font-mono text-slate-500 uppercase tracking-widest">
      <span className="w-1 h-1 rounded-full bg-emerald-400" />
      live · 1.0× / div
    </div>
  );
}

