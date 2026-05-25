"use client";

import { SWATCH_SB, type SBTypeDef } from "./constants";

interface SBHeaderProps {
  def: SBTypeDef;
  livePill: string;
  onClose: () => void;
}

export default function SBHeader({ def, livePill, onClose }: SBHeaderProps) {
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
