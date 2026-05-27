"use client";

import { useState } from "react";

import ICLibrarySection from "@/components/panels/ICLibrarySection";
import { useTimingStore } from "@/store/useTimingStore";
import type { AnySignal, SignalTypeId } from "@/types/signal";

// ---- icons ----------------------------------------------------------------
const ICON_PATHS: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  "square-wave": <path d="M3 16h3v-8h4v8h4v-8h4v8h3" />,
  pulse: <path d="M2 12h4l2-6 4 12 2-6h8" />,
  bus: (
    <g>
      <path d="M3 8h3l2 -2h8l2 2h3" />
      <path d="M3 16h3l2 2h8l2 -2h3" />
    </g>
  ),
  trash: (
    <g>
      <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </g>
  ),
  settings: (
    <g>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </g>
  ),
  diamond: <path d="M12 2l10 10-10 10L2 12z" />,
};

interface IconCLProps {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

export function IconCL({ name, size = 14, className = "", strokeWidth = 1.75 }: IconCLProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICON_PATHS[name] ?? null}
    </svg>
  );
}

const signalIconName = (type: AnySignal["type"]): string =>
  type === "CLOCK" ? "square-wave" : type === "BUS" ? "bus" : "pulse";

function formatSlewMeta(rise: number | undefined, fall: number | undefined): string | null {
  if ((rise == null || rise === 0) && (fall == null || fall === 0)) return null;
  const r = rise ?? 0;
  const f = fall ?? 0;
  return r === f ? `${r}ns` : `${r}/${f}ns`;
}

// ---- logo ----------------------------------------------------------------
function DtSolverLogo() {
  return (
    <div className="relative w-7 h-7 flex items-center justify-center rounded-sm bg-[#11161e] border border-slate-700/70">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 17h3v-8h3v8h3v-8h3v8h3"
          stroke="#22d3ee"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="6" r="2" fill="#22d3ee" opacity="0.85" />
      </svg>
    </div>
  );
}

// ---- panel ----------------------------------------------------------------
export default function ComponentLibrary() {
  const signals = useTimingStore((s) => s.signals);
  const selectedSignalId = useTimingStore((s) => s.selectedSignalId);
  const selectSignal = useTimingStore((s) => s.selectSignal);
  const removeSignal = useTimingStore((s) => s.removeSignal);

  const [open, setOpen] = useState(true);

  const handleAdd = () => {
    useTimingStore.getState().openSignalBuilder();
  };

  const handleAddOfType = (mode: SignalTypeId) => {
    useTimingStore.getState().openSignalBuilder({ mode });
  };

  const clockCount = signals.filter((s) => s.type === "CLOCK").length;
  const dataCount = signals.length - clockCount;

  return (
    <aside
      className="flex flex-col h-full bg-[#0d1117] border-r border-slate-800/80 flex-shrink-0"
      style={{ width: 300 }}
    >
      {/* App header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <DtSolverLogo />
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-medium tracking-tight text-slate-100">dt-solver</span>
            <span className="text-[10.5px] text-slate-500 mt-0.5 font-mono tracking-tight">
              v0.1.0 · timing analyzer
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-sm bg-[#0a0e14] border border-slate-800/80">
            <IconCL name="diamond" size={9} className="text-emerald-400" />
            <span className="text-[10.5px] font-mono text-slate-400 truncate">W65C02S @ 14 MHz</span>
          </div>
          <button
            className="text-slate-500 hover:text-slate-300 p-1 rounded-sm hover:bg-slate-800/60"
            title="Settings"
          >
            <IconCL name="settings" size={13} />
          </button>
        </div>
      </div>

      <ICLibrarySection />

      {/* Section header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between px-4 py-2.5 text-[10.5px] uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300 border-b border-slate-800/60"
      >
        <span className="flex items-center gap-2">
          <IconCL
            name="chevron"
            size={10}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          />
          Active Signals
          <span className="text-slate-600 font-mono normal-case tracking-normal">
            {signals.length}
          </span>
        </span>
        <span className="text-slate-600 font-mono normal-case tracking-normal text-[10px]">
          {clockCount}c · {dataCount}d
        </span>
      </button>

      {open && (
        <div className="flex-1 overflow-y-auto">
          <ul className="py-1">
            {signals.map((sig) => (
              <SignalRowCL
                key={sig.id}
                sig={sig}
                selected={selectedSignalId === sig.id}
                onClick={() => selectSignal(sig.id)}
                onDelete={() => removeSignal(sig.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Add controls */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-sm bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-[12.5px] font-medium transition"
        >
          <IconCL name="plus" size={13} />
          Add Signal
        </button>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {([
            { label: "Clock", icon: "square-wave", mode: "CLOCK" as const },
            { label: "Bus", icon: "bus", mode: "BUS" as const },
            { label: "Line", icon: "pulse", mode: "LINE" as const },
          ] as const).map((t) => (
            <button
              key={t.label}
              onClick={() => handleAddOfType(t.mode)}
              className="flex items-center justify-center gap-1 py-1.5 rounded-sm bg-[#0a0e14] hover:bg-slate-800/60 border border-slate-800/60 text-slate-400 hover:text-slate-200 text-[10.5px]"
            >
              <IconCL name={t.icon} size={10} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

interface SignalRowCLProps {
  sig: AnySignal;
  selected: boolean;
  onClick: () => void;
  onDelete: () => void;
}

function SignalRowCL({ sig, selected, onClick, onDelete }: SignalRowCLProps) {
  const [hover, setHover] = useState(false);
  const icLibrary = useTimingStore((s) => s.icLibrary);
  const provenanceLabel = sig.provenance
    ? icLibrary.find((ic) => ic.id === sig.provenance?.icId)?.name ?? sig.provenance.icId
    : null;
  const baseMeta =
    sig.type === "CLOCK"
      ? `${sig.frequencyMHz}M`
      : sig.type === "BUS"
        ? `[${sig.widthBits - 1}:0]`
        : "1b";
  const slewMeta = formatSlewMeta(sig.riseTimeNs, sig.fallTimeNs);
  const meta = slewMeta ? `${baseMeta} · ${slewMeta}` : baseMeta;
  return (
    <li
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`group mx-2 my-0.5 px-2.5 py-2 rounded-sm cursor-pointer flex items-center gap-2.5 border ${
        selected
          ? "bg-slate-800/60 border-slate-700/80"
          : "border-transparent hover:bg-[#0a0e14] hover:border-slate-800/80"
      }`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: sig.color, boxShadow: `0 0 6px ${sig.color}80` }}
      />
      <IconCL
        name={signalIconName(sig.type)}
        size={13}
        className="text-slate-500 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-mono text-slate-200 truncate leading-tight">
          {sig.name}
        </div>
        <div className="text-[10px] text-slate-500 truncate leading-tight mt-0.5">
          {sig.description}
          {provenanceLabel && (
            <span className="ml-1.5 px-1 py-0 rounded-sm bg-slate-800/60 text-[8.5px] text-slate-500 border border-slate-700/40">
              {provenanceLabel}
            </span>
          )}
        </div>
      </div>
      {hover ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-slate-600 hover:text-rose-400 p-0.5"
          title="Remove signal"
        >
          <IconCL name="trash" size={12} />
        </button>
      ) : (
        <span className="text-[9.5px] font-mono text-slate-600 uppercase tracking-wider">
          {meta}
        </span>
      )}
    </li>
  );
}
