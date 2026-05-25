"use client";

import type { SignalReference } from "@/types/constraint";
import type { AnySignal } from "@/types/signal";

import FormSection from "@/components/ui/FormSection";

import { edgeOptionsFor } from "./constants";

interface FormSignalRefProps {
  label: string;
  kbd?: string;
  value: SignalReference;
  onChange: (v: SignalReference) => void;
  signals: AnySignal[];
  disabled?: boolean;
  accent: string;
}

export function FormSignalRef({
  label,
  kbd,
  value,
  onChange,
  signals,
  disabled,
  accent,
}: FormSignalRefProps) {
  const sig = signals.find((s) => s.id === value.signalId);
  const edges = edgeOptionsFor(sig);
  const typeSuffix =
    sig?.type === "CLOCK"
      ? `${sig.frequencyMHz}M`
      : sig?.type === "BUS"
        ? `[${sig.widthBits - 1}:0]`
        : sig?.type
          ? sig.type.toLowerCase()
          : "";

  return (
    <FormSection label={label} kbd={kbd}>
      <div className="grid grid-cols-[1fr_140px] gap-1.5">
        {/* Signal picker */}
        <div
          className={`relative flex items-center gap-2 px-2.5 py-2 rounded-sm border ${
            disabled
              ? "opacity-60 bg-[#0a0e14]/50 border-slate-800/60"
              : "bg-[#0a0e14] border-slate-800/80 hover:border-slate-700"
          }`}
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{
              background: sig?.color,
              boxShadow: sig?.color ? `0 0 6px ${sig.color}80` : undefined,
            }}
          />
          <select
            aria-label={`${label} signal`}
            disabled={disabled}
            value={value.signalId}
            onChange={(e) => {
              const nextSig = signals.find((s) => s.id === e.target.value);
              const nextEdges = edgeOptionsFor(nextSig);
              onChange({
                signalId: e.target.value,
                edgeDirection: nextEdges[0].id,
              });
            }}
            className="appearance-none bg-transparent flex-1 text-[12.5px] font-mono text-slate-100 focus:outline-none disabled:cursor-not-allowed"
          >
            {signals.map((s) => (
              <option key={s.id} value={s.id} style={{ background: "#0d1117" }}>
                {s.name}
              </option>
            ))}
          </select>
          {typeSuffix && (
            <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-widest">
              {typeSuffix}
            </span>
          )}
        </div>

        {/* Edge selector */}
        <div
          aria-label={`${label} edge direction`}
          role="group"
          className="flex items-stretch rounded-sm overflow-hidden border border-slate-800/80 bg-[#0a0e14]"
        >
          {edges.map((edge) => {
            const active = edge.id === value.edgeDirection;
            return (
              <button
                key={edge.id}
                disabled={disabled}
                onClick={() => onChange({ ...value, edgeDirection: edge.id })}
                className={`flex-1 flex items-center justify-center gap-1 text-[10.5px] font-mono px-1 transition ${
                  active
                    ? "bg-slate-800/80 text-slate-100"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                } ${disabled ? "cursor-not-allowed" : ""}`}
                title={edge.label}
                aria-pressed={active}
              >
                <span
                  className="text-[12px]"
                  style={{ color: active ? accent : undefined }}
                >
                  {edge.arrow}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[10.5px] font-mono text-slate-500 tracking-tight">
        {describeRef(value, sig)}
      </p>
    </FormSection>
  );
}

export function describeRef(ref: SignalReference, sig: AnySignal | undefined): string {
  if (!sig) return "—";
  const dir = ref.edgeDirection;
  if (sig.type === "CLOCK") {
    return `> ${dir.toLowerCase()} edges of ${sig.name} @ ${sig.frequencyMHz} MHz`;
  }
  if (dir === "TRANSITION") {
    return `> any transition on ${sig.name} (incl. → VALID)`;
  }
  return `> ${dir.toLowerCase()} edges on ${sig.name}`;
}
