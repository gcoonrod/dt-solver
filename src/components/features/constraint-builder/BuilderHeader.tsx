"use client";

import type { Constraint } from "@/types/constraint";

import { SWATCH_BG, type TypeDef } from "./constants";

interface BuilderHeaderProps {
  def: TypeDef;
  solved: Constraint;
  onCancel: () => void;
}

export function BuilderHeader({ def, solved, onCancel }: BuilderHeaderProps) {
  return (
    <div className="h-14 flex items-center justify-between px-5 border-b border-slate-800/80 bg-[#11161e] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-7 h-7 rounded-sm border ${SWATCH_BG[def.swatch]}`}
        >
          <span className="font-mono text-[10.5px] tracking-tight">{def.sym}</span>
        </div>
        <div className="flex flex-col leading-tight">
          <div className="text-[14px] font-medium text-slate-100">
            New Constraint
            <span className="ml-2 text-slate-500 font-normal">/ {def.label}</span>
          </div>
          <div className="text-[10.5px] font-mono text-slate-500 tracking-tight">
            constraints · builder
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LiveStatusPill solved={solved} />
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-sm text-slate-500 hover:text-slate-200 hover:bg-slate-800/70"
          title="Close (esc)"
          aria-label="Close"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function LiveStatusPill({ solved }: { solved: Constraint }) {
  if (solved.status === "PASS") {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10.5px] font-mono uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        live · pass
      </span>
    );
  }
  if (solved.status === "FAIL") {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10.5px] font-mono uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        live · fail
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10.5px] font-mono uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      live · unresolved
    </span>
  );
}
