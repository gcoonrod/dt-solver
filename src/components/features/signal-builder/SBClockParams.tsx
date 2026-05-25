"use client";

import FormSection from "@/components/ui/FormSection";
import NumberField from "@/components/ui/NumberField";
import SlewControls from "@/components/ui/SlewControls";

import { FREQ_UNITS, type FreqUnit } from "./constants";

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

export default function SBClockParams(props: SBClockParamsProps) {
  return (
    <FormSection label="Clock Parameters" kbd="frequency · duty · phase · slew">
      <div className="grid grid-cols-4 gap-3">
        <SBFreqField
          value={props.frequencyValue} onChange={props.setFrequencyValue}
          unit={props.frequencyUnit} onUnitChange={props.setFrequencyUnit}
        />
        <SBDutyField value={props.dutyHighPct} onChange={props.setDutyHighPct} />
        <NumberField label="PHASE" value={props.phaseOffsetNs} onChange={props.setPhaseOffsetNs} suffix="ns" />
        <SlewControls
          riseTimeNs={props.riseTimeNs} setRiseTimeNs={props.setRiseTimeNs}
          fallTimeNs={props.fallTimeNs} setFallTimeNs={props.setFallTimeNs}
          linked={props.slewLinked} setLinked={props.setSlewLinked}
        />
      </div>
    </FormSection>
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
