"use client";

import { useState } from "react";

import { useTimingStore } from "@/store/useTimingStore";
import type { ICDefinition, SignalTemplate } from "@/types/ic";
import { IconCL } from "./ComponentLibrary";

const signalIconName = (type: string): string =>
  type === "CLOCK" ? "square-wave" : type === "BUS" ? "bus" : "pulse";

function ICEntryCard({ ic }: { ic: ICDefinition }) {
  const [expanded, setExpanded] = useState(false);
  const signals = useTimingStore((s) => s.signals);
  const importSignal = useTimingStore((s) => s.importSignalFromIC);

  const isImported = (templateId: string) =>
    signals.some(
      (s) => s.provenance?.icId === ic.id && s.provenance?.templateId === templateId,
    );

  const handleImport = (sig: SignalTemplate) => {
    importSignal(ic.id, sig.templateId, sig);
  };

  return (
    <div className="mx-2 my-1">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-sm hover:bg-[#0a0e14] text-left"
      >
        <IconCL
          name="chevron"
          size={10}
          className={`text-slate-500 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-slate-200 truncate">{ic.name}</div>
          <div className="text-[9.5px] text-slate-500 truncate">
            {ic.manufacturer} · {ic.signals.length} signals
          </div>
        </div>
      </button>

      {expanded && (
        <div className="ml-5 mb-1">
          {ic.signals.map((sig) => {
            const imported = isImported(sig.templateId);
            return (
              <div
                key={sig.templateId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: sig.color ?? "#64748b" }}
                />
                <IconCL name={signalIconName(sig.type)} size={11} className="text-slate-500 flex-shrink-0" />
                <span className="flex-1 text-[10.5px] font-mono text-slate-300 truncate">
                  {sig.name}
                </span>
                <button
                  onClick={() => handleImport(sig)}
                  className={`flex items-center justify-center w-5 h-5 rounded-sm text-[10px] ${
                    imported
                      ? "text-emerald-500 opacity-50"
                      : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
                  }`}
                  title={imported ? "Already imported" : `Import ${sig.name}`}
                >
                  {imported ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <IconCL name="plus" size={11} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ICLibrarySection() {
  const icLibrary = useTimingStore((s) => s.icLibrary);
  const [open, setOpen] = useState(true);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between px-4 py-2.5 text-[10.5px] uppercase tracking-[0.14em] text-slate-500 hover:text-slate-300 border-b border-slate-800/60"
      >
        <span className="flex items-center gap-2">
          <IconCL
            name="chevron"
            size={10}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
          />
          IC Library
          <span className="text-slate-600 font-mono normal-case tracking-normal">
            {icLibrary.length}
          </span>
        </span>
      </button>

      {open && (
        <div className="overflow-y-auto" style={{ maxHeight: "40%" }}>
          {icLibrary.length === 0 ? (
            <div className="px-4 py-3 text-[10.5px] text-slate-500">No ICs loaded</div>
          ) : (
            icLibrary.map((ic) => <ICEntryCard key={ic.id} ic={ic} />)
          )}
        </div>
      )}
    </>
  );
}
