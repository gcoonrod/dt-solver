"use client";

import FormSection from "@/components/ui/FormSection";

import type { TypeDef } from "./constants";

interface FormBoundsProps {
  def: TypeDef;
  minNs: string;
  maxNs: string;
  setMinNs: (v: string) => void;
  setMaxNs: (v: string) => void;
}

export function FormBounds({ def, minNs, maxNs, setMinNs, setMaxNs }: FormBoundsProps) {
  const showMin = def.bounds === "min";
  const showMax = def.bounds === "max";
  return (
    <FormSection label="Bounds" kbd="time window">
      <div className="flex items-stretch gap-5">
        <div className="grid grid-cols-2 gap-1.5" style={{ width: 440 }}>
          <BoundInput
            label="min"
            unit="ns"
            value={minNs}
            onChange={setMinNs}
            dim={!showMin}
            symbol={def.sym}
          />
          <BoundInput
            label="max"
            unit="ns"
            value={maxNs}
            onChange={setMaxNs}
            dim={!showMax}
            symbol={def.sym}
          />
        </div>
        <div className="flex-1 flex items-center gap-3 pl-5 border-l border-slate-800/60 min-w-0">
          <div className="flex flex-col leading-tight">
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
              solver checks
            </span>
            <span className="text-[14.5px] font-mono text-slate-200 mt-1">
              {def.inequality}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-800/60 mx-1" />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
              notation
            </span>
            <span className="text-[11px] font-mono text-slate-500 mt-1 truncate">
              {def.sameSignal
                ? "pulse / period measured on anchor signal"
                : "Δ measured between anchor & target events"}
            </span>
          </div>
        </div>
      </div>
    </FormSection>
  );
}

interface BoundInputProps {
  label: "min" | "max";
  unit: string;
  value: string;
  onChange: (v: string) => void;
  dim: boolean;
  symbol: string;
}

export function BoundInput({ label, unit, value, onChange, dim, symbol }: BoundInputProps) {
  return (
    <label
      className={`flex items-stretch rounded-sm border ${
        dim
          ? "opacity-40 bg-[#0a0e14]/30 border-slate-800/60"
          : "bg-[#0a0e14] border-slate-800/80 hover:border-slate-700 focus-within:border-slate-500"
      }`}
    >
      <span className="flex items-center px-2.5 text-[10px] font-mono uppercase tracking-widest text-slate-500 border-r border-slate-800/80">
        {symbol}.{label}
      </span>
      <input
        aria-label={`${symbol} ${label} bound (${unit})`}
        disabled={dim}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] font-mono text-slate-100 focus:outline-none disabled:cursor-not-allowed"
      />
      <span className="flex items-center px-2 text-[10.5px] font-mono text-slate-500 border-l border-slate-800/80">
        {unit}
      </span>
    </label>
  );
}
