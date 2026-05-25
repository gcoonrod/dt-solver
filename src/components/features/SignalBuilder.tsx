"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BusTrace,
  ClockTrace,
  LineTrace,
} from "@/components/canvas/WaveformTimeline";
import { useTimingStore } from "@/store/useTimingStore";
import type {
  AnySignal,
  BusSignal,
  ClockSignal,
  EdgeDirection,
  LineSignal,
  SignalBuilderInitial,
  SignalState,
  SignalTypeId,
  TransitionEvent,
} from "@/types/signal";

// ============================================================================
// Type taxonomy
// ============================================================================

type SBSwatch = "sky" | "amber" | "violet";

interface SBTypeDef {
  id: SignalTypeId;
  label: string;
  sym: string;
  icon: React.ReactNode;
  swatch: SBSwatch;
  blurb: string;
}

const SB_ICON_CLOCK = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 16h3v-8h4v8h4v-8h4v8h3" />
  </svg>
);

const SB_ICON_BUS = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <g><path d="M3 8h3l2 -2h8l2 2h3" /><path d="M3 16h3l2 2h8l2 -2h3" /></g>
  </svg>
);

const SB_ICON_LINE = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12h4l2-6 4 12 2-6h8" />
  </svg>
);

const TYPE_DEFS: SBTypeDef[] = [
  { id: "CLOCK", label: "Clock", sym: "clk", icon: SB_ICON_CLOCK, swatch: "sky", blurb: "Periodic signal with frequency, duty cycle, and phase offset." },
  { id: "BUS", label: "Bus", sym: "[n:0]", icon: SB_ICON_BUS, swatch: "amber", blurb: "Multi-bit data bus with transitions between valid/invalid states." },
  { id: "LINE", label: "Line", sym: "1b", icon: SB_ICON_LINE, swatch: "violet", blurb: "Single-bit signal with high/low transitions." },
];

const TYPE_DEF_BY_ID: Record<SignalTypeId, SBTypeDef> = Object.fromEntries(
  TYPE_DEFS.map((d) => [d.id, d]),
) as Record<SignalTypeId, SBTypeDef>;

const SWATCH_SB: Record<SBSwatch, { active: string; icon: string }> = {
  sky: {
    active: "bg-sky-500/10 border-sky-500/30 text-sky-300 shadow-[inset_0_1px_3px_rgba(56,189,248,0.08)] font-medium",
    icon: "bg-sky-500/15 border-sky-500/30 text-sky-300",
  },
  amber: {
    active: "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[inset_0_1px_3px_rgba(245,158,11,0.08)] font-medium",
    icon: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  },
  violet: {
    active: "bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-[inset_0_1px_3px_rgba(167,139,250,0.08)] font-medium",
    icon: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  },
};

// ============================================================================
// Constants
// ============================================================================

const FREQ_UNITS = ["Hz", "kHz", "MHz", "GHz"] as const;
type FreqUnit = (typeof FREQ_UNITS)[number];
const FREQ_TO_MHZ: Record<FreqUnit, number> = { Hz: 1e-6, kHz: 1e-3, MHz: 1, GHz: 1e3 };

const COLOR_PALETTE = [
  "#22d3ee", "#f59e0b", "#a78bfa", "#f472b6",
  "#a3e635", "#fb7185", "#38bdf8", "#34d399",
];

function bestUnitForMHz(mhz: number): { value: number; unit: FreqUnit } {
  if (mhz >= 1000) return { value: mhz / 1000, unit: "GHz" };
  if (mhz >= 1) return { value: mhz, unit: "MHz" };
  if (mhz >= 0.001) return { value: mhz * 1000, unit: "kHz" };
  return { value: mhz * 1e6, unit: "Hz" };
}

// ============================================================================
// Time formatting for rulers
// ============================================================================

function sbFormatTime(ns: number): string {
  const abs = Math.abs(ns);
  if (abs < 0.001) return `${(ns * 1e6).toFixed(0)} fs`;
  if (abs < 1) return `${(ns * 1000).toFixed(1)} ps`;
  if (abs < 1000) return `${ns.toFixed(1)} ns`;
  if (abs < 1e6) return `${(ns / 1000).toFixed(2)} µs`;
  return `${(ns / 1e6).toFixed(3)} ms`;
}

function sbFormatTickWithStep(t: number, niceStep: number): string {
  let unit: string;
  let divisor: number;
  if (niceStep < 0.001) {
    unit = "fs"; divisor = 1e-6;
  } else if (niceStep < 1) {
    unit = "ps"; divisor = 0.001;
  } else if (niceStep < 1000) {
    unit = "ns"; divisor = 1;
  } else if (niceStep < 1e6) {
    unit = "µs"; divisor = 1000;
  } else {
    unit = "ms"; divisor = 1e6;
  }
  const v = t / divisor;
  const s = Number.isInteger(v) ? v.toString() : v.toFixed(1);
  return `${s} ${unit}`;
}

// ============================================================================
// Default transition seeds
// ============================================================================

function defaultTransitions(typeId: SignalTypeId): TransitionEvent[] {
  if (typeId === "BUS") {
    return [
      { id: "sb-t1", timeNs: 20, newState: "VALID", direction: "TRANSITION", value: "0x00" },
      { id: "sb-t2", timeNs: 45, newState: "INVALID", direction: "TRANSITION" },
      { id: "sb-t3", timeNs: 70, newState: "VALID", direction: "TRANSITION", value: "0xFF" },
    ];
  }
  return [
    { id: "sb-t1", timeNs: 20, newState: "HIGH", direction: "RISING" },
    { id: "sb-t2", timeNs: 50, newState: "LOW", direction: "FALLING" },
    { id: "sb-t3", timeNs: 80, newState: "HIGH", direction: "RISING" },
  ];
}

function directionForState(state: SignalState, typeId: SignalTypeId): EdgeDirection {
  if (typeId === "BUS") return "TRANSITION";
  if (state === "HIGH") return "RISING";
  if (state === "LOW") return "FALLING";
  return "TRANSITION";
}

// ============================================================================
// Root: returns null when closed. Uses key trick for re-seeding on re-open.
// ============================================================================

export default function SignalBuilder() {
  const open = useTimingStore((s) => s.signalBuilderOpen);
  const initial = useTimingStore((s) => s.signalBuilderInitial);
  const closeSignalBuilder = useTimingStore((s) => s.closeSignalBuilder);
  const [openSession, setOpenSession] = useState(0);
  const prevInitialRef = useRef(initial);

  useEffect(() => {
    if (open && initial !== prevInitialRef.current) {
      setOpenSession((n) => n + 1);
    }
    prevInitialRef.current = initial;
  }, [open, initial]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Signal builder"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(2, 6, 12, 0.66)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSignalBuilder();
      }}
    >
      <BuilderShell key={openSession} initial={initial} onClose={closeSignalBuilder} />
    </div>
  );
}

// ============================================================================
// Shell — owns all form state
// ============================================================================

function deriveTypeId(initial: SignalBuilderInitial | null): SignalTypeId {
  if (!initial) return "LINE";
  if ("mode" in initial) return initial.mode;
  return initial.type;
}

interface BuilderShellProps {
  initial: SignalBuilderInitial | null;
  onClose: () => void;
}

function isFullSignal(v: SignalBuilderInitial | null): v is AnySignal {
  return v != null && "type" in v && (v.type === "CLOCK" || v.type === "BUS" || v.type === "LINE");
}

function BuilderShell({ initial, onClose }: BuilderShellProps) {
  const signals = useTimingStore((s) => s.signals);
  const addSignal = useTimingStore((s) => s.addSignal);

  const [typeId, _setTypeId] = useState<SignalTypeId>(() => deriveTypeId(initial));
  const def = TYPE_DEF_BY_ID[typeId];

  // --- shared form state (seeded from initial if it's a full signal) ---
  const [nameTouched, setNameTouched] = useState(() => isFullSignal(initial));
  const [nameValue, setNameValue] = useState(() => isFullSignal(initial) ? initial.name : "");
  const [description, setDescription] = useState(() => isFullSignal(initial) ? (initial.description ?? "") : "");
  const [color, setColor] = useState(() => {
    if (isFullSignal(initial) && initial.color) return initial.color;
    const used = new Set(signals.map((s) => s.color));
    return COLOR_PALETTE.find((c) => !used.has(c)) || COLOR_PALETTE[0];
  });
  const [riseTimeNs, setRiseTimeNs] = useState(() =>
    isFullSignal(initial) && initial.riseTimeNs != null ? String(initial.riseTimeNs) : "0"
  );
  const [fallTimeNs, setFallTimeNs] = useState(() =>
    isFullSignal(initial) && initial.fallTimeNs != null ? String(initial.fallTimeNs) : "0"
  );
  const [slewLinked, setSlewLinked] = useState(true);

  // --- clock-only ---
  const [frequencyValue, setFrequencyValue] = useState(() => {
    if (isFullSignal(initial) && initial.type === "CLOCK") {
      const best = bestUnitForMHz(initial.frequencyMHz);
      return String(best.value);
    }
    return "14";
  });
  const [frequencyUnit, setFrequencyUnit] = useState<FreqUnit>(() => {
    if (isFullSignal(initial) && initial.type === "CLOCK") {
      return bestUnitForMHz(initial.frequencyMHz).unit;
    }
    return "MHz";
  });
  const [dutyHighPct, setDutyHighPct] = useState(() =>
    isFullSignal(initial) && initial.type === "CLOCK" ? String(initial.dutyCycle * 100) : "50"
  );
  const [phaseOffsetNs, setPhaseOffsetNs] = useState(() =>
    isFullSignal(initial) && initial.type === "CLOCK" ? String(initial.phaseOffsetNs) : "0"
  );

  // --- data-only ---
  const initType = deriveTypeId(initial);
  const [widthBits, setWidthBits] = useState(() => {
    if (isFullSignal(initial) && initial.type === "BUS")
      return String(initial.widthBits);
    return "8";
  });
  const [baseState, setBaseState] = useState<SignalState>(() => {
    if (isFullSignal(initial) && (initial.type === "BUS" || initial.type === "LINE")) return initial.baseState;
    return initType === "BUS" ? "INVALID" : "LOW";
  });
  const [transitions, setTransitions] = useState<TransitionEvent[]>(() => {
    if (isFullSignal(initial) && (initial.type === "BUS" || initial.type === "LINE")) return initial.transitions;
    return defaultTransitions(initType);
  });

  // Type switching re-seeds data-only state through event handler, not useEffect
  const handleTypeChange = (newTypeId: SignalTypeId) => {
    _setTypeId(newTypeId);
    if (newTypeId === "BUS") {
      setBaseState("INVALID");
      setWidthBits("8");
    } else if (newTypeId === "LINE") {
      setBaseState("LOW");
    }
    setTransitions(defaultTransitions(newTypeId));
  };

  // Auto-derive name
  const autoName = useMemo(() => {
    const n = signals.length + 1;
    if (typeId === "CLOCK") return `CLK${n}`;
    if (typeId === "BUS") return `BUS${n}[7:0]`;
    return `SIG${n}`;
  }, [typeId, signals.length]);

  const displayName = nameTouched ? nameValue : autoName;
  const normalizedName = displayName.trim();

  // Build draft signal
  const draft: AnySignal = useMemo(() => {
    const base = {
      id: "sb-draft",
      name: normalizedName,
      description,
      color,
      riseTimeNs: Math.max(0, Number(riseTimeNs) || 0),
      fallTimeNs: Math.max(0, Number(fallTimeNs) || 0),
    };
    if (typeId === "CLOCK") {
      return {
        ...base,
        type: "CLOCK" as const,
        frequencyMHz: Number(frequencyValue) * FREQ_TO_MHZ[frequencyUnit],
        dutyCycle: Number(dutyHighPct) / 100,
        phaseOffsetNs: Number(phaseOffsetNs),
      };
    }
    const sorted = [...transitions].sort((a, b) => a.timeNs - b.timeNs);
    if (typeId === "BUS") {
      return {
        ...base,
        type: "BUS" as const,
        baseState,
        transitions: sorted,
        widthBits: Math.max(2, Number(widthBits) || 8),
      };
    }
    return {
      ...base,
      type: "LINE" as const,
      baseState,
      transitions: sorted,
    };
  }, [
    normalizedName, description, color, riseTimeNs, fallTimeNs, typeId,
    frequencyValue, frequencyUnit, dutyHighPct, phaseOffsetNs,
    baseState, transitions, widthBits,
  ]);

  // Validation
  const validity = useMemo(() => {
    if (normalizedName.length === 0) return { ok: false, reason: "empty-name" as const };
    if (typeId === "CLOCK") {
      const freq = Number(frequencyValue) * FREQ_TO_MHZ[frequencyUnit];
      if (freq <= 0 || !Number.isFinite(freq)) return { ok: false, reason: "bad-freq" as const };
      const duty = Number(dutyHighPct);
      if (!Number.isFinite(duty) || duty <= 0 || duty >= 100) return { ok: false, reason: "bad-duty" as const };
    } else {
      if (transitions.length === 0) return { ok: false, reason: "no-transitions" as const };
      if (transitions.some((t) => !Number.isFinite(t.timeNs))) return { ok: false, reason: "bad-time" as const };
    }
    const rise = Number(riseTimeNs);
    const fall = Number(fallTimeNs);
    if (rise < 0 || !Number.isFinite(rise) || fall < 0 || !Number.isFinite(fall)) {
      return { ok: false, reason: "bad-slew" as const };
    }
    return { ok: true, reason: undefined };
  }, [normalizedName, typeId, frequencyValue, frequencyUnit, dutyHighPct, transitions, riseTimeNs, fallTimeNs]);

  const nameCollision = signals.some((s) => s.name === normalizedName);

  const submit = () => {
    if (!validity.ok) return;
    const id = `sig-${Date.now().toString(36)}`;
    const sig = { ...draft, id };
    addSignal(sig);
    useTimingStore.getState().closeSignalBuilder();
  };

  // Live readout for header pill
  const livePill = useMemo(() => {
    if (typeId === "CLOCK") {
      const freq = Number(frequencyValue) * FREQ_TO_MHZ[frequencyUnit];
      if (freq > 0 && Number.isFinite(freq)) {
        const period = 1000 / freq;
        return `${sbFormatTime(period)} @ ${frequencyValue} ${frequencyUnit}`;
      }
      return "—";
    }
    if (typeId === "BUS") {
      const validCount = transitions.filter((t) => t.newState === "VALID").length;
      return `${validCount} valid window${validCount !== 1 ? "s" : ""}`;
    }
    return `${transitions.length} edge${transitions.length !== 1 ? "s" : ""}`;
  }, [typeId, frequencyValue, frequencyUnit, transitions]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="relative flex flex-col bg-[#0d1117] border border-slate-700/60 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
      style={{
        width: 1140,
        height: 860,
        maxHeight: "92vh",
        maxWidth: "96vw",
        fontFamily: "var(--font-sans)",
      }}
    >
      <SBHeader def={def} livePill={livePill} onClose={onClose} />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Row 1 — Name | Type */}
        <div className="grid grid-cols-[minmax(280px,1fr)_2fr] flex-shrink-0">
          <div className="border-r border-slate-800/60">
            <SBFormSection
              label="Name"
              kbd={nameTouched ? "manual override" : "auto-derived"}
              action={
                nameTouched ? (
                  <button
                    onClick={() => { setNameTouched(false); setNameValue(""); }}
                    className="text-[10px] font-mono text-slate-500 hover:text-slate-200 uppercase tracking-widest"
                  >
                    reset
                  </button>
                ) : undefined
              }
            >
              <input
                aria-label="Signal name"
                value={displayName}
                onChange={(e) => { setNameTouched(true); setNameValue(e.target.value); }}
                spellCheck={false}
                className="w-full px-3 py-2 rounded-sm bg-[#0a0e14] border border-slate-800/80 hover:border-slate-700 focus:border-slate-500 focus:outline-none text-[13px] font-mono text-slate-100 placeholder-slate-600 transition"
                placeholder={autoName}
              />
            </SBFormSection>
          </div>
          <SBFormType value={typeId} onChange={handleTypeChange} />
        </div>

        {/* Preview */}
        <div
          className="flex flex-col bg-[#0a0e14] border-y border-slate-800/80"
          style={{ flex: "1 0 auto", minHeight: 300, marginTop: 16, marginBottom: 16 }}
        >
          <SBPreviewHeader def={def} />
          <div className="flex-1 min-h-0 relative">
            <SBPreviewWaveform draft={draft} typeId={typeId} />
          </div>
        </div>

        {/* Type-conditional config */}
        <div className="flex-shrink-0">
          {typeId === "CLOCK" ? (
            <SBClockParams
              frequencyValue={frequencyValue} setFrequencyValue={setFrequencyValue}
              frequencyUnit={frequencyUnit} setFrequencyUnit={setFrequencyUnit}
              dutyHighPct={dutyHighPct} setDutyHighPct={setDutyHighPct}
              phaseOffsetNs={phaseOffsetNs} setPhaseOffsetNs={setPhaseOffsetNs}
              riseTimeNs={riseTimeNs} setRiseTimeNs={setRiseTimeNs}
              fallTimeNs={fallTimeNs} setFallTimeNs={setFallTimeNs}
              slewLinked={slewLinked} setSlewLinked={setSlewLinked}
            />
          ) : (
            <SBDataParams
              typeId={typeId}
              baseState={baseState} setBaseState={setBaseState}
              widthBits={widthBits} setWidthBits={setWidthBits}
              transitions={transitions} setTransitions={setTransitions}
              riseTimeNs={riseTimeNs} setRiseTimeNs={setRiseTimeNs}
              fallTimeNs={fallTimeNs} setFallTimeNs={setFallTimeNs}
              slewLinked={slewLinked} setSlewLinked={setSlewLinked}
            />
          )}

          <SBAppearanceRow
            color={color} setColor={setColor}
            description={description} setDescription={setDescription}
            signals={signals}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="h-14 flex items-center justify-between px-5 border-t border-slate-800/80 bg-[#0d1117] flex-shrink-0">
        <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800 text-slate-400 normal-case tracking-normal">esc</kbd>
            cancel
          </span>
          <span className="text-slate-700">/</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800 text-slate-400 normal-case tracking-normal">⌘ ⏎</kbd>
            add signal
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!validity.ok && (
            <span className="text-[11px] font-mono text-rose-400">
              {explainValidity(validity.reason)}
            </span>
          )}
          {validity.ok && nameCollision && (
            <span className="text-[11px] font-mono text-amber-400">
              name already used by another signal
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm text-[12px] text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
            >
              Cancel
            </button>
            <button
              disabled={!validity.ok}
              onClick={submit}
              className={`px-4 py-1.5 rounded-sm text-[12.5px] font-medium border transition ${
                validity.ok
                  ? "bg-slate-100 text-slate-900 border-slate-100 hover:bg-white"
                  : "bg-slate-800/60 text-slate-500 border-slate-800/80 cursor-not-allowed"
              }`}
            >
              Add signal
            </button>
          </div>
        </div>
      </div>

      <SBKeyboardShortcuts onEsc={onClose} onSubmit={submit} />
    </div>
  );
}

function explainValidity(reason?: string): string {
  switch (reason) {
    case "empty-name": return "Signal name is required";
    case "bad-freq": return "Frequency must be positive";
    case "bad-duty": return "Duty must be between 0% and 100%";
    case "no-transitions": return "At least one transition is required";
    case "bad-time": return "Transition time must be a number";
    case "bad-slew": return "Rise/fall time must be non-negative";
    default: return "";
  }
}

// ============================================================================
// Header
// ============================================================================

interface SBHeaderProps {
  def: SBTypeDef;
  livePill: string;
  onClose: () => void;
}

function SBHeader({ def, livePill, onClose }: SBHeaderProps) {
  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800/80 bg-[#11161e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-7 h-7 rounded-sm border ${SWATCH_SB[def.swatch].icon}`}>
          {def.icon}
        </div>
        <div className="flex flex-col leading-tight">
          <div className="text-[14px] font-medium text-slate-100">
            New Signal
            <span className="ml-2 text-slate-500 font-normal">/ {def.label}</span>
          </div>
          <div className="text-[10.5px] font-mono text-slate-500 tracking-tight">
            signals · builder
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-slate-800/40 border border-slate-700/40 text-slate-400 text-[10.5px] font-mono tracking-tight">
          {livePill}
        </span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800/70"
          title="Close (esc)"
          aria-label="Close"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Form section helpers
// ============================================================================

interface SBFormSectionProps {
  label: string;
  kbd?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function SBFormSection({ label, kbd, action, children }: SBFormSectionProps) {
  return (
    <section className="px-5 pt-4 pb-4 border-b border-slate-800/60">
      <div className="flex items-center justify-between mb-2.5 whitespace-nowrap">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">{label}</span>
          {kbd && <span className="text-[9.5px] font-mono text-slate-600 tracking-tight truncate">{kbd}</span>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// ============================================================================
// Type chip selector
// ============================================================================

interface SBFormTypeProps {
  value: SignalTypeId;
  onChange: (v: SignalTypeId) => void;
}

function SBFormType({ value, onChange }: SBFormTypeProps) {
  return (
    <SBFormSection label="Type" kbd="signal kind">
      <div className="grid grid-cols-3 gap-1.5">
        {TYPE_DEFS.map((d) => {
          const active = d.id === value;
          return (
            <button
              key={d.id}
              onClick={() => onChange(d.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-sm border text-[11px] leading-none whitespace-nowrap transition ${
                active
                  ? `${SWATCH_SB[d.swatch].active} border-current`
                  : "bg-[#0a0e14] border-slate-800/80 text-slate-300 hover:text-slate-100 hover:border-slate-700"
              }`}
              title={d.blurb}
              aria-label={`${d.sym} ${d.label}`}
            >
              {d.icon}
              <span>{d.label}</span>
              <span className={`font-mono text-[10px] ${active ? "opacity-70" : "text-slate-500"}`}>{d.sym}</span>
            </button>
          );
        })}
      </div>
    </SBFormSection>
  );
}

// ============================================================================
// Preview header
// ============================================================================

function SBPreviewHeader({ def }: { def: SBTypeDef }) {
  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800/80 flex-shrink-0 bg-[#0a0e14]">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        live waveform preview
      </div>
      <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-500">
        <span>{def.label} signal</span>
      </div>
    </div>
  );
}

// ============================================================================
// Preview waveform
// ============================================================================

const PV_SB = { pad: 28, headerH: 38 } as const;

interface SBPreviewWaveformProps {
  draft: AnySignal;
  typeId: SignalTypeId;
}

function SBPreviewWaveform({ draft, typeId }: SBPreviewWaveformProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(620);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isClock = typeId === "CLOCK";
  const rowH = isClock ? 140 : 80;
  const sigH = isClock ? 28 : 28;

  const { tMin, tMax } = useMemo(() => {
    if (isClock && draft.type === "CLOCK") {
      const freq = draft.frequencyMHz;
      if (freq > 0 && Number.isFinite(freq)) {
        const T = 1000 / freq;
        return { tMin: -T, tMax: 2 * T };
      }
      return { tMin: -100, tMax: 200 };
    }
    // DATA signals: fit around transitions
    const dataDraft = draft as LineSignal | BusSignal;
    const times = dataDraft.transitions.map((t) => t.timeNs);
    if (times.length === 0) return { tMin: -10, tMax: 100 };
    const lo = Math.min(...times);
    const hi = Math.max(...times);
    const margin = Math.max(20, (hi - lo) * 0.25);
    return { tMin: lo - margin, tMax: hi + margin };
  }, [isClock, draft]);

  const span = tMax - tMin;
  const plotW = Math.max(120, width - PV_SB.pad * 2);
  const tToX = (t: number) => PV_SB.pad + ((t - tMin) / span) * plotW;
  const totalH = PV_SB.headerH + rowH + 8;

  const niceStep = useMemo(() => {
    const target = span / 6;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    return [1, 2, 5, 10].map((m) => m * pow).find((c) => c >= target) || pow;
  }, [span]);
  const ticks: number[] = [];
  for (let t = Math.ceil(tMin / niceStep) * niceStep; t <= tMax + 1e-6; t += niceStep) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }

  const yTop = PV_SB.headerH + (rowH - sigH) / 2;
  const showT0 = tMin < 0 && tMax > 0;

  return (
    <div ref={wrapRef} className="w-full h-full overflow-hidden flex items-center" style={{ fontFamily: "var(--font-mono)" }}>
      <svg width={width} height={totalH} style={{ display: "block" }}>
        <defs>
          <marker id="sbArrR" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
          <marker id="sbArrL" viewBox="0 0 6 6" refX="1" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M6 0 L0 3 L6 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Grid */}
        {ticks.map((t) => (
          <line key={`g${t}`} x1={tToX(t)} x2={tToX(t)} y1={PV_SB.headerH - 4} y2={totalH - 6} stroke="rgba(125,159,195,0.10)" />
        ))}
        {ticks.map((t) => (
          <text key={`tl${t}`} x={tToX(t)} y={PV_SB.headerH - 12} textAnchor="middle" fontSize="10" fill="rgba(180,200,220,0.55)">
            {sbFormatTickWithStep(t, niceStep)}
          </text>
        ))}
        <line x1={0} x2={width} y1={PV_SB.headerH} y2={PV_SB.headerH} stroke="rgba(180,200,220,0.25)" />

        {/* Row bg + label */}
        <rect x={0} y={PV_SB.headerH} width={width} height={rowH} fill="rgba(34, 211, 238, 0.02)" />
        <text x={PV_SB.pad} y={PV_SB.headerH + 16} fontSize="10.5" fill="rgba(180,200,220,0.55)" letterSpacing="0.05em">
          <tspan fill={draft.color}>{draft.name}</tspan>
          <tspan dx="8" fill="rgba(125,159,195,0.7)" fontSize="9.5">· preview</tspan>
        </text>

        {/* t=0 reference line */}
        {showT0 && (
          <g>
            <line x1={tToX(0)} x2={tToX(0)} y1={PV_SB.headerH} y2={PV_SB.headerH + rowH} stroke="rgba(180,200,220,0.45)" strokeWidth="1.2" />
            <text x={tToX(0)} y={PV_SB.headerH + 12} textAnchor="middle" fontSize="9" fill="rgba(180,200,220,0.55)">t₀</text>
          </g>
        )}

        {/* Trace */}
        <SBPreviewTrace draft={draft} typeId={typeId} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />

        {/* Clock rulers */}
        {isClock && draft.type === "CLOCK" && draft.frequencyMHz > 0 && Number.isFinite(draft.frequencyMHz) && (
          <SBClockRulers
            clock={draft}
            yTop={yTop}
            sigH={sigH}
            tToX={tToX}
          />
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Preview trace dispatch
// ============================================================================

interface SBPreviewTraceProps {
  draft: AnySignal;
  typeId: SignalTypeId;
  yTop: number;
  sigH: number;
  tMin: number;
  tMax: number;
  tToX: (t: number) => number;
}

function SBPreviewTrace({ draft, typeId, yTop, sigH, tMin, tMax, tToX }: SBPreviewTraceProps) {
  if (typeId === "CLOCK" && draft.type === "CLOCK") {
    return <ClockTrace sig={draft} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  if (typeId === "BUS") {
    return <BusTrace sig={draft as BusSignal} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  return <LineTrace sig={draft as LineSignal} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
}

// ============================================================================
// Clock rulers
// ============================================================================

interface SBClockRulersProps {
  clock: ClockSignal;
  yTop: number;
  sigH: number;
  tToX: (t: number) => number;
}

function SBClockRulers({ clock, yTop, sigH, tToX }: SBClockRulersProps) {
  const T = 1000 / clock.frequencyMHz;
  const highDur = clock.dutyCycle * T;
  const phase = clock.phaseOffsetNs || 0;
  const phaseMod = ((phase % T) + T) % T;
  const targetRise = phase >= 0 || phaseMod === 0 ? phaseMod : phaseMod - T;
  const firstFall = targetRise + highDur;
  const nextRise = targetRise + T;

  const yAbove = yTop - 11;
  const yBelow = yTop + sigH + 12;
  const yPhase = yBelow + 18;

  const showPhase = Math.abs(phase) > 1e-9;

  return (
    <g>
      {/* Period ruler above */}
      <SBRulerBracket x1={tToX(targetRise)} x2={tToX(nextRise)} y={yAbove} color="#94a3b8" label={`T = ${sbFormatTime(T)}`} />

      {/* High-duration ruler below */}
      <SBRulerBracket x1={tToX(targetRise)} x2={tToX(firstFall)} y={yBelow} color={clock.color || "#22d3ee"} label={`tH = ${sbFormatTime(highDur)}`} />

      {/* Low-duration ruler below */}
      <SBRulerBracket x1={tToX(firstFall)} x2={tToX(nextRise)} y={yBelow} color="#94a3b8" label={`tL = ${sbFormatTime(T - highDur)}`} />

      {/* Phase ruler */}
      {showPhase && (
        <SBRulerBracket x1={tToX(0)} x2={tToX(targetRise)} y={yPhase} color="#fde047" label={`φ = ${sbFormatTime(phase)}`} dashed />
      )}
    </g>
  );
}

// ============================================================================
// Ruler bracket
// ============================================================================

interface SBRulerBracketProps {
  x1: number;
  x2: number;
  y: number;
  color: string;
  label: string;
  dashed?: boolean;
}

function SBRulerBracket({ x1, x2, y, color, label, dashed }: SBRulerBracketProps) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const w = right - left;
  const showLabel = w >= 22;
  const mid = (left + right) / 2;

  return (
    <g style={{ color }}>
      {/* End ticks */}
      <line x1={left} x2={left} y1={y - 2} y2={y + 2} stroke={color} strokeWidth="1" />
      <line x1={right} x2={right} y1={y - 2} y2={y + 2} stroke={color} strokeWidth="1" />

      {/* Horizontal line */}
      <line
        x1={left + 1}
        x2={right - 1}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth="1"
        strokeDasharray={dashed ? "3 2" : undefined}
        markerStart="url(#sbArrL)"
        markerEnd="url(#sbArrR)"
      />

      {/* Label */}
      {showLabel && (
        <g>
          <rect x={mid - 44} y={y - 7} width={88} height={14} rx="2" fill="#0a0e14" fillOpacity="0.85" />
          <text x={mid} y={y + 3.5} textAnchor="middle" fontSize="9.5" fill={color} fontFamily="var(--font-mono)">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

// ============================================================================
// Clock parameters section
// ============================================================================

interface SBClockParamsProps {
  frequencyValue: string; setFrequencyValue: (v: string) => void;
  frequencyUnit: FreqUnit; setFrequencyUnit: (v: FreqUnit) => void;
  dutyHighPct: string; setDutyHighPct: (v: string) => void;
  phaseOffsetNs: string; setPhaseOffsetNs: (v: string) => void;
  riseTimeNs: string; setRiseTimeNs: (v: string) => void;
  fallTimeNs: string; setFallTimeNs: (v: string) => void;
  slewLinked: boolean; setSlewLinked: (v: boolean) => void;
}

function SBClockParams(props: SBClockParamsProps) {
  return (
    <SBFormSection label="Clock Parameters" kbd="frequency · duty · phase · slew">
      <div className="grid grid-cols-4 gap-3">
        <SBFreqField
          value={props.frequencyValue} onChange={props.setFrequencyValue}
          unit={props.frequencyUnit} onUnitChange={props.setFrequencyUnit}
        />
        <SBDutyField value={props.dutyHighPct} onChange={props.setDutyHighPct} />
        <SBNumberField label="PHASE" value={props.phaseOffsetNs} onChange={props.setPhaseOffsetNs} suffix="ns" />
        <SBSlewField
          riseTimeNs={props.riseTimeNs} setRiseTimeNs={props.setRiseTimeNs}
          fallTimeNs={props.fallTimeNs} setFallTimeNs={props.setFallTimeNs}
          linked={props.slewLinked} setLinked={props.setSlewLinked}
        />
      </div>
    </SBFormSection>
  );
}

// ============================================================================
// Frequency field
// ============================================================================

interface SBFreqFieldProps {
  value: string; onChange: (v: string) => void;
  unit: FreqUnit; onUnitChange: (v: FreqUnit) => void;
}

function SBFreqField({ value, onChange, unit, onUnitChange }: SBFreqFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">FREQ</span>
      <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] hover:border-slate-700 focus-within:border-slate-500">
        <input
          aria-label="Frequency value"
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] font-mono text-slate-100 focus:outline-none"
        />
        <select
          aria-label="Frequency unit"
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as FreqUnit)}
          className="appearance-none bg-transparent px-2 py-1 text-[10.5px] font-mono text-slate-400 border-l border-slate-800/80 focus:outline-none cursor-pointer"
          style={{ minWidth: 56 }}
        >
          {FREQ_UNITS.map((u) => (
            <option key={u} value={u} style={{ background: "#0d1117" }}>{u}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

// ============================================================================
// Duty field
// ============================================================================

interface SBDutyFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function SBDutyField({ value, onChange }: SBDutyFieldProps) {
  const low = 100 - (Number(value) || 0);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">HIGH</span>
      <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] hover:border-slate-700 focus-within:border-slate-500">
        <input
          aria-label="Duty cycle high percent"
          type="number"
          step="any"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] font-mono text-slate-100 focus:outline-none"
        />
        <span className="flex items-center px-2 text-[10px] font-mono text-slate-500 border-l border-slate-800/80 whitespace-nowrap">
          % <span className="text-slate-600 ml-1">/ low {low}%</span>
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Number field (generic)
// ============================================================================

interface SBNumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
}

function SBNumberField({ label, value, onChange, suffix, min }: SBNumberFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] hover:border-slate-700 focus-within:border-slate-500">
        <input
          aria-label={label}
          type="number"
          step="any"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] font-mono text-slate-100 focus:outline-none"
        />
        {suffix && <span className="flex items-center px-2 text-[10.5px] font-mono text-slate-500 border-l border-slate-800/80">{suffix}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Slew field (rise/fall with link toggle)
// ============================================================================

interface SBSlewFieldProps {
  riseTimeNs: string; setRiseTimeNs: (v: string) => void;
  fallTimeNs: string; setFallTimeNs: (v: string) => void;
  linked: boolean; setLinked: (v: boolean) => void;
}

function SBSlewField({ riseTimeNs, setRiseTimeNs, fallTimeNs, setFallTimeNs, linked, setLinked }: SBSlewFieldProps) {
  const handleRise = (v: string) => {
    setRiseTimeNs(v);
    if (linked) setFallTimeNs(v);
  };
  const handleFall = (v: string) => {
    setFallTimeNs(v);
    if (linked) setRiseTimeNs(v);
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">SLEW</span>
      <div className="flex items-stretch gap-1">
        <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] flex-1">
          <span className="flex items-center px-1.5 text-[9px] font-mono text-slate-600">↑</span>
          <input
            aria-label="Rise time"
            type="number" step="any" min={0} value={riseTimeNs}
            onChange={(e) => handleRise(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[12px] font-mono text-slate-100 focus:outline-none"
          />
          <span className="flex items-center px-1 text-[9.5px] font-mono text-slate-600">ns</span>
        </div>
        <button
          onClick={() => setLinked(!linked)}
          className={`flex items-center justify-center w-6 rounded-sm border text-[10px] ${
            linked
              ? "border-sky-500/30 text-sky-400 bg-sky-500/10"
              : "border-slate-800/80 text-slate-600 bg-[#0a0e14]"
          }`}
          title={linked ? "Unlink rise/fall" : "Link rise/fall"}
          aria-label={linked ? "Unlink slew" : "Link slew"}
        >
          {linked ? "⇄" : "≠"}
        </button>
        <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] flex-1">
          <span className="flex items-center px-1.5 text-[9px] font-mono text-slate-600">↓</span>
          <input
            aria-label="Fall time"
            type="number" step="any" min={0} value={fallTimeNs}
            onChange={(e) => handleFall(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[12px] font-mono text-slate-100 focus:outline-none"
          />
          <span className="flex items-center px-1 text-[9.5px] font-mono text-slate-600">ns</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Data parameters (BUS / LINE)
// ============================================================================

interface SBDataParamsProps {
  typeId: SignalTypeId;
  baseState: SignalState; setBaseState: (v: SignalState) => void;
  widthBits: string; setWidthBits: (v: string) => void;
  transitions: TransitionEvent[]; setTransitions: (v: TransitionEvent[]) => void;
  riseTimeNs: string; setRiseTimeNs: (v: string) => void;
  fallTimeNs: string; setFallTimeNs: (v: string) => void;
  slewLinked: boolean; setSlewLinked: (v: boolean) => void;
}

function SBDataParams(props: SBDataParamsProps) {
  const isBus = props.typeId === "BUS";
  return (
    <>
      <SBFormSection label="Initial State" kbd={isBus ? "base · width · slew" : "base · slew"}>
        <div className={`grid gap-3 ${isBus ? "grid-cols-3" : "grid-cols-2"}`}>
          <SBStateField
            label="STATE"
            value={props.baseState}
            onChange={props.setBaseState}
            options={isBus ? ["VALID", "INVALID", "HIGH_Z"] : ["LOW", "HIGH", "HIGH_Z"]}
          />
          {isBus && (
            <SBNumberField label="WIDTH" value={props.widthBits} onChange={props.setWidthBits} suffix="bits" min={2} />
          )}
          <SBSlewField
            riseTimeNs={props.riseTimeNs} setRiseTimeNs={props.setRiseTimeNs}
            fallTimeNs={props.fallTimeNs} setFallTimeNs={props.setFallTimeNs}
            linked={props.slewLinked} setLinked={props.setSlewLinked}
          />
        </div>
      </SBFormSection>

      <SBTransitionsEditor
        typeId={props.typeId}
        transitions={props.transitions}
        setTransitions={props.setTransitions}
      />
    </>
  );
}

// ============================================================================
// State field (segmented)
// ============================================================================

interface SBStateFieldProps {
  label: string;
  value: SignalState;
  onChange: (v: SignalState) => void;
  options: SignalState[];
}

function SBStateField({ label, value, onChange, options }: SBStateFieldProps) {
  const labels: Record<SignalState, string> = {
    LOW: "LOW", HIGH: "HIGH", HIGH_Z: "HiZ",
    VALID: "VALID", INVALID: "INVALID",
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-stretch rounded-sm overflow-hidden border border-slate-800/80 bg-[#0a0e14]">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 flex items-center justify-center text-[10.5px] font-mono px-1 py-2 transition ${
                active ? "bg-slate-800/80 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
              }`}
              aria-pressed={active}
            >
              {labels[opt]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Transitions editor
// ============================================================================

interface SBTransitionsEditorProps {
  typeId: SignalTypeId;
  transitions: TransitionEvent[];
  setTransitions: (v: TransitionEvent[]) => void;
}

function SBTransitionsEditor({ typeId, transitions, setTransitions }: SBTransitionsEditorProps) {
  const isBus = typeId === "BUS";
  const stateOptions: SignalState[] = isBus ? ["VALID", "INVALID", "HIGH_Z"] : ["LOW", "HIGH", "HIGH_Z"];

  const isOutOfOrder = transitions.length >= 2 && transitions.some((t, i) => i > 0 && t.timeNs < transitions[i - 1].timeNs);

  const handleAdd = () => {
    const lastTime = transitions.length > 0 ? transitions[transitions.length - 1].timeNs : 0;
    const prevState = transitions.length > 0 ? transitions[transitions.length - 1].newState : (isBus ? "INVALID" : "LOW");
    const nextState = isBus
      ? (prevState === "VALID" ? "INVALID" : "VALID")
      : (prevState === "HIGH" ? "LOW" : "HIGH");
    const newRow: TransitionEvent = {
      id: `sb-t${Date.now().toString(36)}`,
      timeNs: lastTime + 25,
      newState: nextState,
      direction: directionForState(nextState, typeId),
      ...(isBus && nextState === "VALID" ? { value: "0x00" } : {}),
    };
    setTransitions([...transitions, newRow]);
  };

  const handleRemove = (id: string) => {
    setTransitions(transitions.filter((t) => t.id !== id));
  };

  const handleUpdate = (id: string, patch: Partial<TransitionEvent>) => {
    setTransitions(transitions.map((t) => {
      if (t.id !== id) return t;
      const merged = { ...t, ...patch };
      if (patch.newState) {
        merged.direction = directionForState(patch.newState, typeId);
        if (isBus && patch.newState !== "VALID") {
          delete merged.value;
        }
      }
      return merged;
    }));
  };

  const handleSort = () => {
    setTransitions([...transitions].sort((a, b) => a.timeNs - b.timeNs));
  };

  return (
    <SBFormSection
      label="Transitions"
      kbd={`${transitions.length} row${transitions.length !== 1 ? "s" : ""}`}
      action={
        <div className="flex items-center gap-3">
          {isOutOfOrder && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-amber-400">out of order</span>
              <button onClick={handleSort} className="text-[10px] font-mono text-amber-400 hover:text-amber-200 underline underline-offset-2">
                sort by time
              </button>
            </div>
          )}
          <button onClick={handleAdd} className="text-[10px] font-mono text-slate-400 hover:text-slate-200 uppercase tracking-widest">
            + add row
          </button>
        </div>
      }
    >
      {transitions.length === 0 ? (
        <button
          onClick={handleAdd}
          className="w-full py-4 rounded-sm border-2 border-dashed border-slate-800/80 text-[11px] font-mono text-slate-500 hover:text-slate-300 hover:border-slate-700 transition"
        >
          + add row
        </button>
      ) : (
        <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto pr-1">
          {transitions.map((tr, i) => (
            <SBTransitionRow
              key={tr.id}
              index={i}
              tr={tr}
              isBus={isBus}
              stateOptions={stateOptions}
              onUpdate={(patch) => handleUpdate(tr.id, patch)}
              onRemove={() => handleRemove(tr.id)}
            />
          ))}
        </div>
      )}
    </SBFormSection>
  );
}

// ============================================================================
// Transition row
// ============================================================================

interface SBTransitionRowProps {
  index: number;
  tr: TransitionEvent;
  isBus: boolean;
  stateOptions: SignalState[];
  onUpdate: (patch: Partial<TransitionEvent>) => void;
  onRemove: () => void;
}

function SBTransitionRow({ index, tr, isBus, stateOptions, onUpdate, onRemove }: SBTransitionRowProps) {
  const stateLabels: Record<SignalState, string> = {
    LOW: "LOW", HIGH: "HIGH", HIGH_Z: "HiZ",
    VALID: "VALID", INVALID: "INVALID",
  };
  return (
    <div className="grid items-stretch gap-1.5" style={{ gridTemplateColumns: isBus ? "24px 1fr 120px 1fr 28px" : "24px 1fr 120px 28px" }}>
      <span className="flex items-center justify-center text-[10px] font-mono text-slate-600">{index + 1}.</span>

      <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14]">
        <input
          aria-label={`Transition ${index + 1} time`}
          type="number" step="any"
          value={tr.timeNs}
          onChange={(e) => onUpdate({ timeNs: Number(e.target.value) })}
          className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-[12px] font-mono text-slate-100 focus:outline-none"
        />
        <span className="flex items-center px-1.5 text-[9.5px] font-mono text-slate-600">ns</span>
      </div>

      <div className="flex items-stretch rounded-sm overflow-hidden border border-slate-800/80 bg-[#0a0e14]">
        {stateOptions.map((opt) => {
          const active = opt === tr.newState;
          return (
            <button
              key={opt}
              onClick={() => onUpdate({ newState: opt })}
              className={`flex-1 flex items-center justify-center text-[9.5px] font-mono px-0.5 transition ${
                active ? "bg-slate-800/80 text-slate-100" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
              }`}
              aria-pressed={active}
            >
              {stateLabels[opt]}
            </button>
          );
        })}
      </div>

      {isBus && (
        <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14]">
          <input
            aria-label={`Transition ${index + 1} value`}
            type="text"
            value={tr.value ?? ""}
            disabled={tr.newState !== "VALID"}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="0x00"
            className="flex-1 min-w-0 bg-transparent px-2 py-1.5 text-[12px] font-mono text-slate-100 focus:outline-none disabled:text-slate-600 disabled:cursor-not-allowed"
          />
        </div>
      )}

      <button
        onClick={onRemove}
        className="flex items-center justify-center text-slate-600 hover:text-rose-400 rounded-sm"
        title="Remove transition"
        aria-label={`Remove transition ${index + 1}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// Appearance row
// ============================================================================

interface SBAppearanceRowProps {
  color: string; setColor: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  signals: AnySignal[];
}

function SBAppearanceRow({ color, setColor, description, setDescription, signals }: SBAppearanceRowProps) {
  const usedColors = new Set(signals.map((s) => s.color));
  return (
    <SBFormSection label="Appearance" kbd="color · description">
      <div className="grid grid-cols-[auto_1fr] gap-3 items-stretch">
        <div className="flex items-center gap-1.5">
          {COLOR_PALETTE.map((c) => {
            const active = c === color;
            const inUse = usedColors.has(c);
            return (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`relative w-6 h-6 rounded-sm transition ${active ? "ring-2 ring-offset-1 ring-offset-[#0d1117]" : ""} ${inUse && !active ? "opacity-40" : ""}`}
                style={{
                  background: c,
                  ...(active ? { "--tw-ring-color": c } as React.CSSProperties : {}),
                }}
                title={c}
                aria-label={`Color ${c}`}
                aria-pressed={active}
              >
                {inUse && !active && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 24 24">
                    <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <input
          aria-label="Signal description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Signal description..."
          className="w-full px-3 py-2 rounded-sm bg-[#0a0e14] border border-slate-800/80 hover:border-slate-700 focus:border-slate-500 focus:outline-none text-[12px] font-mono text-slate-100 placeholder-slate-600 transition"
        />
      </div>
    </SBFormSection>
  );
}

// ============================================================================
// Keyboard shortcuts
// ============================================================================

interface SBKeyboardShortcutsProps {
  onEsc: () => void;
  onSubmit: () => void;
}

function SBKeyboardShortcuts({ onEsc, onSubmit }: SBKeyboardShortcutsProps) {
  const escRef = useRef(onEsc);
  const submitRef = useRef(onSubmit);
  useEffect(() => { escRef.current = onEsc; }, [onEsc]);
  useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        escRef.current();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submitRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
