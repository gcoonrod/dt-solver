"use client";

import { IconCL } from "@/components/panels/ComponentLibrary";
import { useTimingStore } from "@/store/useTimingStore";
import type { AnySignal } from "@/types/signal";
import type { Constraint, ConstraintType, SignalReference } from "@/types/constraint";

export default function ConstraintInspector() {
  const solved = useTimingStore((s) => s.solved);
  const signals = useTimingStore((s) => s.signals);
  const hoveredId = useTimingStore((s) => s.hoveredConstraintId);
  const hoverConstraint = useTimingStore((s) => s.hoverConstraint);
  const openBuilder = useTimingStore((s) => s.openBuilder);
  const removeConstraint = useTimingStore((s) => s.removeConstraint);

  const passCount = solved.filter((c) => c.status === "PASS").length;
  const failCount = solved.filter((c) => c.status === "FAIL").length;
  const unresolved = solved.filter((c) => c.status === "UNRESOLVED").length;

  const handleAdd = () => openBuilder();

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-10 border-b border-slate-800/80 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[12.5px] font-medium text-slate-200">Constraint Inspector</span>
          <span className="text-[10.5px] font-mono text-slate-500">{solved.length} rules</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {passCount} pass
          </span>
          <span
            className={`flex items-center gap-1 ${failCount > 0 ? "text-rose-400" : "text-slate-600"}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${failCount > 0 ? "bg-rose-400" : "bg-slate-700"}`}
            />
            {failCount} fail
          </span>
          {unresolved > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {unresolved} unresolved
            </span>
          )}
          <div className="w-px h-4 bg-slate-800" />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-2 py-1 rounded-sm bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 text-slate-200 text-[11px]"
          >
            <IconCL name="plus" size={11} /> New constraint
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-[12px]">
          <thead className="sticky top-0 bg-[#0d1117] z-10">
            <tr className="text-slate-500 text-[10px] uppercase tracking-[0.12em]">
              <Th width="32px" />
              <Th>Constraint</Th>
              <Th width="20%">Anchor</Th>
              <Th width="22%">Target</Th>
              <Th width="14%" right>
                Required
              </Th>
              <Th width="14%" right>
                Calculated
              </Th>
              <Th width="86px" right>
                Slack
              </Th>
              <Th width="34px" />
            </tr>
          </thead>
          <tbody>
            {solved.map((c, i) => (
              <ConstraintRow
                key={c.id}
                c={c}
                signals={signals}
                hovered={hoveredId === c.id}
                stripe={i % 2 === 1}
                onMouseEnter={() => hoverConstraint(c.id)}
                onMouseLeave={() => hoverConstraint(null)}
                onDelete={() => removeConstraint(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer status bar */}
      <div className="flex items-center justify-between px-3 h-7 border-t border-slate-800/80 text-[10.5px] font-mono text-slate-500 flex-shrink-0 bg-[#0a0e14]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${failCount > 0 ? "bg-rose-400" : "bg-emerald-400"}`}
            />
            {failCount > 0
              ? `${failCount} constraint${failCount > 1 ? "s" : ""} violated`
              : "all constraints satisfied"}
          </span>
          <span className="text-slate-600">·</span>
          <span>solver: cycle-accurate</span>
          <span className="text-slate-600">·</span>
          <span>iter 1 / 1</span>
        </div>
        <div className="flex items-center gap-3">
          <span>last solve: 0.42 ms</span>
          <span className="text-slate-600">·</span>
          <span>
            {signals.length} sig · {solved.length} cstr
          </span>
        </div>
      </div>
    </div>
  );
}

interface ThProps {
  children?: React.ReactNode;
  width?: string;
  right?: boolean;
}

function Th({ children, width, right }: ThProps) {
  return (
    <th
      style={{ width }}
      className={`px-3 py-2 font-medium ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function describeSignalRef(ref: SignalReference, signals: AnySignal[]): string {
  const sig = signals.find((s) => s.id === ref.signalId);
  if (!sig) return ref.signalId;
  if (sig.type === "CLOCK") {
    return `${sig.name} ${ref.edgeDirection.toLowerCase()} edge`;
  }
  if (ref.edgeDirection === "TRANSITION") {
    return `${sig.name} valid`;
  }
  return `${sig.name} ${ref.edgeDirection.toLowerCase()} edge`;
}

interface ConstraintRowProps {
  c: Constraint;
  signals: AnySignal[];
  hovered: boolean;
  stripe: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: () => void;
}

function ConstraintRow({
  c,
  signals,
  hovered,
  stripe,
  onMouseEnter,
  onMouseLeave,
  onDelete,
}: ConstraintRowProps) {
  const fail = c.status === "FAIL";
  const unresolved = c.status === "UNRESOLVED";
  const failTint = fail ? "bg-rose-950/30" : "";
  const stripeBg = stripe && !fail ? "bg-slate-900/30" : "";
  const hoverBg = hovered ? "bg-slate-800/50" : "";

  const calc = c.calculatedMarginNs;
  let required = "";
  let slack: number | null = null;
  if (c.minNs != null && c.maxNs != null) {
    required = `${c.minNs}–${c.maxNs} ns`;
    if (calc != null) slack = Math.min(calc - c.minNs, c.maxNs - calc);
  } else if (c.minNs != null) {
    required = `≥ ${c.minNs} ns`;
    if (calc != null) slack = calc - c.minNs;
  } else if (c.maxNs != null) {
    required = `≤ ${c.maxNs} ns`;
    if (calc != null) slack = c.maxNs - calc;
  }

  const anchorColor = signals.find((s) => s.id === c.anchor.signalId)?.color;
  const targetColor = signals.find((s) => s.id === c.target.signalId)?.color;

  return (
    <tr
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`border-b border-slate-800/40 ${failTint} ${stripeBg} ${hoverBg} cursor-pointer group`}
    >
      <td className="px-3 py-2.5 align-middle">
        <StatusBadge status={c.status} />
      </td>
      <td className="px-3 py-2.5 align-middle">
        <div className="flex items-center gap-2">
          <span className="text-slate-100 text-[12.5px]">{c.name}</span>
          <TypeChip type={c.type} />
        </div>
      </td>
      <td className="px-3 py-2.5 align-middle">
        <span className="flex items-center gap-1.5 text-slate-300 font-mono text-[11.5px]">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: anchorColor }}
          />
          {describeSignalRef(c.anchor, signals)}
        </span>
      </td>
      <td className="px-3 py-2.5 align-middle">
        <span className="flex items-center gap-1.5 text-slate-300 font-mono text-[11.5px]">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: targetColor }}
          />
          {describeSignalRef(c.target, signals)}
        </span>
      </td>
      <td className="px-3 py-2.5 align-middle text-right font-mono text-[11.5px] text-slate-400">
        {required}
      </td>
      <td
        className={`px-3 py-2.5 align-middle text-right font-mono text-[12px] ${
          fail
            ? "text-rose-400 font-semibold"
            : unresolved
              ? "text-slate-600"
              : "text-slate-100"
        }`}
      >
        {calc != null ? `${calc.toFixed(1)} ns` : "—"}
      </td>
      <td
        className={`px-3 py-2.5 align-middle text-right font-mono text-[11px] ${
          fail ? "text-rose-400" : unresolved ? "text-slate-600" : "text-emerald-400"
        }`}
      >
        {slack != null ? `${slack >= 0 ? "+" : ""}${slack.toFixed(1)}` : "—"}
      </td>
      <td className="px-3 py-2.5 align-middle text-right">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-400 transition"
          title="Remove constraint"
        >
          <IconCL name="trash" size={11} />
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: Constraint["status"] }) {
  if (status === "PASS") {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "FAIL") {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-rose-500/15 border border-rose-500/40 text-rose-400">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
      ?
    </span>
  );
}

const TYPE_STYLES: Record<ConstraintType, string> = {
  SETUP: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  HOLD: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  PROP_DELAY: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  MIN_PULSE: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  CYCLE_TIME: "bg-slate-700/30 text-slate-300 border-slate-600/30",
};

function TypeChip({ type }: { type: ConstraintType }) {
  const styles = TYPE_STYLES[type];
  const label =
    type === "PROP_DELAY"
      ? "prop"
      : type === "MIN_PULSE"
        ? "pulse"
        : type === "CYCLE_TIME"
          ? "cycle"
          : type.toLowerCase();
  return (
    <span
      className={`text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-mono border ${styles}`}
    >
      {label}
    </span>
  );
}
