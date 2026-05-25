"use client";

import FormSection from "@/components/ui/FormSection";
import type { SignalState, SignalTypeId, TransitionEvent } from "@/types/signal";

import { directionForState } from "./constants";

// ============================================================================
// Transitions editor
// ============================================================================

interface SBTransitionsEditorProps {
  typeId: SignalTypeId;
  transitions: TransitionEvent[];
  setTransitions: (v: TransitionEvent[]) => void;
}

export default function SBTransitionsEditor({ typeId, transitions, setTransitions }: SBTransitionsEditorProps) {
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
    <FormSection
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
    </FormSection>
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
