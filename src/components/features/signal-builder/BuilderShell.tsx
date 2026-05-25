"use client";

import { useMemo, useState } from "react";

import KeyboardShortcuts from "@/components/ui/KeyboardShortcuts";
import FormSection from "@/components/ui/FormSection";
import { useTimingStore } from "@/store/useTimingStore";
import type {
  AnySignal,
  SignalBuilderInitial,
  SignalState,
  SignalTypeId,
  TransitionEvent,
} from "@/types/signal";

import {
  bestUnitForMHz,
  COLOR_PALETTE,
  defaultTransitions,
  FREQ_TO_MHZ,
  sbFormatTime,
  TYPE_DEF_BY_ID,
  type FreqUnit,
} from "./constants";
import SBAppearanceRow from "./SBAppearanceRow";
import SBClockParams from "./SBClockParams";
import SBDataParams from "./SBDataParams";
import SBFormType from "./SBFormType";
import SBHeader from "./SBHeader";
import SBPreviewWaveform, { SBPreviewHeader } from "./SBPreviewWaveform";

// ============================================================================
// Helpers
// ============================================================================

export function deriveTypeId(initial: SignalBuilderInitial | null): SignalTypeId {
  if (!initial) return "LINE";
  if ("mode" in initial) return initial.mode;
  return initial.type;
}

export function isFullSignal(v: SignalBuilderInitial | null): v is AnySignal {
  return v != null && "type" in v && (v.type === "CLOCK" || v.type === "BUS" || v.type === "LINE");
}

export function explainValidity(reason?: string): string {
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
// Shell — owns all form state
// ============================================================================

interface BuilderShellProps {
  initial: SignalBuilderInitial | null;
  onClose: () => void;
}

export default function BuilderShell({ initial, onClose }: BuilderShellProps) {
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
    onClose();
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
            <FormSection
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
            </FormSection>
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
            <kbd className="px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800 text-slate-400 normal-case tracking-normal">{"⌘ ⏎"}</kbd>
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

      <KeyboardShortcuts onEsc={onClose} onSubmit={submit} />
    </div>
  );
}
