"use client";

import type { Constraint } from "@/types/constraint";

import type { TypeDef } from "./constants";

interface PreviewFooterProps {
  solved: Constraint;
  def: TypeDef;
  draft: Constraint;
}

export function PreviewFooter({ solved, def, draft }: PreviewFooterProps) {
  const pass = solved.status === "PASS";
  const fail = solved.status === "FAIL";
  const calc = solved.calculatedMarginNs;
  let slack: number | null = null;
  if (calc != null) {
    if (solved.minNs != null) slack = calc - solved.minNs;
    else if (solved.maxNs != null) slack = solved.maxNs - calc;
  }
  return (
    <div className="border-t border-slate-800/80 px-4 py-3 grid grid-cols-4 gap-3 flex-shrink-0 bg-[#0d1117]">
      <Metric
        label="required"
        value={
          def.bounds === "min"
            ? `≥ ${Number(draft.minNs)} ns`
            : `≤ ${Number(draft.maxNs)} ns`
        }
      />
      <Metric
        label="calculated"
        value={calc != null ? `${calc.toFixed(1)} ns` : "—"}
        accent={fail ? "text-rose-400" : pass ? "text-slate-100" : "text-slate-500"}
      />
      <Metric
        label="slack"
        value={
          slack != null
            ? `${slack >= 0 ? "+" : ""}${slack.toFixed(1)} ns`
            : "—"
        }
        accent={fail ? "text-rose-400" : pass ? "text-emerald-400" : "text-slate-500"}
      />
      <Metric
        label="status"
        value={solved.status?.toLowerCase() ?? "unresolved"}
        accent={fail ? "text-rose-400" : pass ? "text-emerald-400" : "text-amber-400"}
      />
    </div>
  );
}

interface MetricProps {
  label: string;
  value: string;
  accent?: string;
}

export function Metric({ label, value, accent = "text-slate-100" }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className={`text-[14px] font-mono mt-1 ${accent}`}>{value}</span>
    </div>
  );
}
