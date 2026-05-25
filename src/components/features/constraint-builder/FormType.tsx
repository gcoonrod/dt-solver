"use client";

import type { ConstraintType } from "@/types/constraint";

import FormSection from "@/components/ui/FormSection";

import { SWATCH_BG, TYPE_DEFS } from "./constants";

interface FormTypeProps {
  value: ConstraintType;
  onChange: (v: ConstraintType) => void;
}

export function FormType({ value, onChange }: FormTypeProps) {
  return (
    <FormSection label="Type" kbd="constraint kind">
      <div className="grid grid-cols-5 gap-1.5">
        {TYPE_DEFS.map((def) => {
          const active = def.id === value;
          return (
            <button
              key={def.id}
              onClick={() => onChange(def.id)}
              className={`flex items-baseline justify-center gap-1 px-1.5 py-2 rounded-sm border text-[11px] leading-none whitespace-nowrap transition ${
                active
                  ? `${SWATCH_BG[def.swatch]} border-current font-medium`
                  : "bg-[#0a0e14] border-slate-800/80 text-slate-300 hover:text-slate-100 hover:border-slate-700"
              }`}
              title={def.blurb}
            >
              <span
                className={`font-mono text-[10px] uppercase tracking-tight ${
                  active ? "opacity-80" : "text-slate-500"
                }`}
              >
                {def.sym}
              </span>
              <span className="text-slate-500/60 text-[10px]">·</span>
              <span>{def.label}</span>
            </button>
          );
        })}
      </div>
    </FormSection>
  );
}
