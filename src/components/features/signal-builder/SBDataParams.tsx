"use client";

import FormSection from "@/components/ui/FormSection";
import NumberField from "@/components/ui/NumberField";
import SlewControls from "@/components/ui/SlewControls";
import type { SignalState, SignalTypeId, TransitionEvent } from "@/types/signal";

import SBTransitionsEditor from "./SBTransitionsEditor";

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

export default function SBDataParams(props: SBDataParamsProps) {
  const isBus = props.typeId === "BUS";
  return (
    <>
      <FormSection label="Initial State" kbd={isBus ? "base · width · slew" : "base · slew"}>
        <div className={`grid gap-3 ${isBus ? "grid-cols-3" : "grid-cols-2"}`}>
          <SBStateField
            label="STATE"
            value={props.baseState}
            onChange={props.setBaseState}
            options={isBus ? ["VALID", "INVALID", "HIGH_Z"] : ["LOW", "HIGH", "HIGH_Z"]}
          />
          {isBus && (
            <NumberField label="WIDTH" value={props.widthBits} onChange={props.setWidthBits} suffix="bits" min={2} />
          )}
          <SlewControls
            riseTimeNs={props.riseTimeNs} setRiseTimeNs={props.setRiseTimeNs}
            fallTimeNs={props.fallTimeNs} setFallTimeNs={props.setFallTimeNs}
            linked={props.slewLinked} setLinked={props.setSlewLinked}
          />
        </div>
      </FormSection>

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

export function SBStateField({ label, value, onChange, options }: SBStateFieldProps) {
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
