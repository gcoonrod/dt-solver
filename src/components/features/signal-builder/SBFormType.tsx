"use client";

import FormSection from "@/components/ui/FormSection";
import type { SignalTypeId } from "@/types/signal";

import { SWATCH_SB, TYPE_DEFS } from "./constants";

interface SBFormTypeProps {
  value: SignalTypeId;
  onChange: (v: SignalTypeId) => void;
}

export default function SBFormType({ value, onChange }: SBFormTypeProps) {
  return (
    <FormSection label="Type" kbd="signal kind">
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
    </FormSection>
  );
}
