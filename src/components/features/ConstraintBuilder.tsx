"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BusTrace,
  ClockTrace,
  formatTime,
  LineTrace,
} from "@/components/canvas/WaveformTimeline";
import {
  evaluateConstraint,
  resolveReference,
  type ResolvedEvent,
} from "@/core/solver";
import { useTimingStore } from "@/store/useTimingStore";
import type {
  Constraint,
  ConstraintType,
  SignalReference,
} from "@/types/constraint";
import type { AnySignal, EdgeDirection } from "@/types/signal";

// ============================================================================
// Type taxonomy — kept in this file because the modal is its single consumer.
// Mirrors the prototype's TYPE_DEFS (design-handoff/prototype/ConstraintBuilder.jsx).
// ============================================================================

type Swatch = "sky" | "violet" | "amber" | "emerald" | "slate";

interface TypeDef {
  id: ConstraintType;
  label: string;
  sym: string;
  blurb: string;
  inequality: string;
  bounds: "min" | "max";
  sameSignal: boolean;
  swatch: Swatch;
  accent: string;
}

const TYPE_DEFS: TypeDef[] = [
  {
    id: "SETUP",
    label: "Setup",
    sym: "tSU",
    blurb: "Target settles a minimum time before the anchor edge.",
    inequality: "Δ ≥ tSU,min",
    bounds: "min",
    sameSignal: false,
    swatch: "sky",
    accent: "#38bdf8",
  },
  {
    id: "HOLD",
    label: "Hold",
    sym: "tH",
    blurb: "Target remains stable a minimum time after the anchor edge.",
    inequality: "Δ ≥ tH,min",
    bounds: "min",
    sameSignal: false,
    swatch: "violet",
    accent: "#a78bfa",
  },
  {
    id: "PROP_DELAY",
    label: "Prop Delay",
    sym: "tPD",
    blurb: "Target follows the anchor edge within a maximum delay.",
    inequality: "Δ ≤ tPD,max",
    bounds: "max",
    sameSignal: false,
    swatch: "amber",
    accent: "#f59e0b",
  },
  {
    id: "MIN_PULSE",
    label: "Min Pulse",
    sym: "tW",
    blurb: "Pulse width on the anchor signal must exceed the minimum.",
    inequality: "pw ≥ tW,min",
    bounds: "min",
    sameSignal: true,
    swatch: "emerald",
    accent: "#34d399",
  },
  {
    id: "CYCLE_TIME",
    label: "Cycle Time",
    sym: "tCYC",
    blurb: "Period between successive same-direction anchor edges.",
    inequality: "T ≥ tCYC,min",
    bounds: "min",
    sameSignal: true,
    swatch: "slate",
    accent: "#94a3b8",
  },
];

const TYPE_DEF_BY_ID: Record<ConstraintType, TypeDef> = Object.fromEntries(
  TYPE_DEFS.map((d) => [d.id, d]),
) as Record<ConstraintType, TypeDef>;

const SWATCH_BG: Record<Swatch, string> = {
  sky: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  violet: "bg-violet-500/10 border-violet-500/30 text-violet-300",
  amber: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  slate: "bg-slate-500/10 border-slate-500/40 text-slate-300",
};

interface EdgeOption {
  id: EdgeDirection;
  label: string;
  arrow: string;
}

function edgeOptionsFor(sig: AnySignal | undefined): EdgeOption[] {
  if (!sig) return [{ id: "TRANSITION", label: "Any", arrow: "⤳" }];
  if (sig.type === "CLOCK") {
    return [
      { id: "RISING", label: "Rising", arrow: "↑" },
      { id: "FALLING", label: "Falling", arrow: "↓" },
    ];
  }
  return [
    { id: "TRANSITION", label: "Valid", arrow: "⤳" },
    { id: "RISING", label: "Rising", arrow: "↑" },
    { id: "FALLING", label: "Falling", arrow: "↓" },
  ];
}

// ============================================================================
// Root: subscribes to builderOpen/Initial and mounts the shell on a fresh key
// so reopening always gets fresh form state (the prototype's openSession trick).
// ============================================================================

export default function ConstraintBuilder() {
  const open = useTimingStore((s) => s.builderOpen);
  const initial = useTimingStore((s) => s.builderInitial);
  const signals = useTimingStore((s) => s.signals);
  const closeBuilder = useTimingStore((s) => s.closeBuilder);
  const addConstraint = useTimingStore((s) => s.addConstraint);

  if (!open) return null;

  // The early return above guarantees the shell unmounts whenever the modal
  // closes, so reopening always gets a fresh form. No openSession key needed.
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Constraint builder"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(2, 6, 12, 0.66)",
        backdropFilter: "blur(4px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeBuilder();
      }}
    >
      <BuilderShell
        signals={signals}
        initial={initial}
        onCancel={closeBuilder}
        onSubmit={(c) => {
          addConstraint(c);
          closeBuilder();
        }}
      />
    </div>
  );
}

// ============================================================================
// Shell — owns all form state. Every subcomponent gets exactly what it needs.
// ============================================================================

interface BuilderShellProps {
  signals: AnySignal[];
  initial: Constraint | null;
  onCancel: () => void;
  onSubmit: (c: Constraint) => void;
}

function BuilderShell({ signals, initial, onCancel, onSubmit }: BuilderShellProps) {
  const defaultAnchor = useMemo<SignalReference>(() => {
    if (initial?.anchor) return initial.anchor;
    const clk = signals.find((s) => s.type === "CLOCK");
    if (clk) return { signalId: clk.id, edgeDirection: "FALLING" };
    return {
      signalId: signals[0]?.id ?? "",
      edgeDirection: "TRANSITION",
    };
    // Initial-mount defaults — explicitly NOT a function of `signals` over the
    // session lifetime; the `key={openSession}` on the shell guarantees a
    // fresh mount per open, so we capture once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultTarget = useMemo<SignalReference>(() => {
    if (initial?.target) return initial.target;
    const dat = signals.find((s) => s.type === "DATA");
    if (dat) return { signalId: dat.id, edgeDirection: "TRANSITION" };
    return {
      signalId: signals[1]?.id ?? signals[0]?.id ?? "",
      edgeDirection: "TRANSITION",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [type, setType] = useState<ConstraintType>(initial?.type ?? "SETUP");
  const [anchor, setAnchor] = useState<SignalReference>(defaultAnchor);
  const [target, setTarget] = useState<SignalReference>(defaultTarget);
  const [minNs, setMinNs] = useState<string>(String(initial?.minNs ?? 20));
  const [maxNs, setMaxNs] = useState<string>(String(initial?.maxNs ?? 30));

  const def = TYPE_DEF_BY_ID[type];

  // Same-signal types (MIN_PULSE / CYCLE_TIME) pin the target to the anchor.
  // We derive this at render time instead of mirroring it into `target` state
  // so switching back to a non-same-signal type restores the user's choice.
  const effectiveTarget = useMemo<SignalReference>(
    () =>
      def.sameSignal
        ? { signalId: anchor.signalId, edgeDirection: anchor.edgeDirection }
        : target,
    [def.sameSignal, anchor.signalId, anchor.edgeDirection, target],
  );

  // Name auto-derives from (type + target). We store ONLY the user's manual
  // override (or null) and compute the displayed name inline; reset = clear
  // the override. This sidesteps the React-19 set-state-in-effect rule and
  // keeps the input always-in-sync with its derived default.
  const autoName = useMemo(() => {
    const targetSig = signals.find((s) => s.id === effectiveTarget.signalId);
    const targetTok = targetSig
      ? targetSig.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6)
      : "";
    return `${def.sym} — ${targetTok || "new"} ${def.label.toLowerCase()}`;
  }, [def, effectiveTarget.signalId, signals]);
  const [userName, setUserName] = useState<string | null>(
    initial?.name ?? null,
  );
  const name = userName ?? autoName;
  const nameTouched = userName !== null;

  const draft: Constraint = useMemo(() => {
    const c: Constraint = {
      id: initial?.id ?? "c-draft",
      name,
      type,
      anchor,
      target: effectiveTarget,
    };
    if (def.bounds === "min") c.minNs = Number(minNs);
    if (def.bounds === "max") c.maxNs = Number(maxNs);
    return c;
  }, [
    initial?.id,
    name,
    type,
    anchor,
    effectiveTarget,
    minNs,
    maxNs,
    def.bounds,
  ]);

  const solved: Constraint = useMemo(() => {
    try {
      return evaluateConstraint(draft, signals, 200);
    } catch {
      return { ...draft, status: "UNRESOLVED" };
    }
  }, [draft, signals]);

  const boundValue = def.bounds === "min" ? minNs : maxNs;
  const valid =
    name.trim().length > 0 &&
    anchor.signalId.length > 0 &&
    effectiveTarget.signalId.length > 0 &&
    signals.some((s) => s.id === anchor.signalId) &&
    signals.some((s) => s.id === effectiveTarget.signalId) &&
    !Number.isNaN(Number(boundValue));

  const submit = () => {
    if (!valid) return;
    onSubmit({ ...draft, id: `c-${Date.now().toString(36)}` });
  };

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="relative flex flex-col bg-[#0d1117] border border-slate-700/60 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
      style={{
        width: 1140,
        height: 860,
        maxHeight: "92vh",
        maxWidth: "96vw",
        fontFamily: "var(--font-sans)",
      }}
    >
      <BuilderHeader def={def} solved={solved} onCancel={onCancel} />

      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Row 1 — Name | Type */}
        <div className="grid grid-cols-[minmax(280px,1fr)_2fr] flex-shrink-0">
          <div className="border-r border-slate-800/60">
            <FormName
              value={name}
              onChange={setUserName}
              autoName={autoName}
              touched={nameTouched}
              reset={() => setUserName(null)}
            />
          </div>
          <FormType value={type} onChange={setType} />
        </div>

        {/* Preview */}
        <div
          className="flex flex-col bg-[#0a0e14] border-y border-slate-800/80"
          style={{
            flex: "1 0 auto",
            minHeight: 320,
            marginTop: 16,
            marginBottom: 16,
          }}
        >
          <PreviewHeader def={def} />
          <div className="flex-1 min-h-0 relative">
            <PreviewWaveform
              draft={draft}
              solved={solved}
              signals={signals}
              def={def}
            />
          </div>
          <PreviewFooter solved={solved} def={def} draft={draft} />
        </div>

        {/* Lower form */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-2">
            <div className="border-r border-slate-800/60">
              <FormSignalRef
                label="Anchor"
                kbd="reference edge"
                value={anchor}
                onChange={setAnchor}
                signals={signals}
                accent="#fde047"
              />
            </div>
            <FormSignalRef
              label={def.sameSignal ? "Target (same signal)" : "Target"}
              kbd={def.sameSignal ? "auto-pinned" : "measured signal"}
              value={effectiveTarget}
              onChange={setTarget}
              signals={signals}
              disabled={def.sameSignal}
              accent="#22d3ee"
            />
          </div>
          <FormBounds
            def={def}
            minNs={minNs}
            maxNs={maxNs}
            setMinNs={setMinNs}
            setMaxNs={setMaxNs}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="h-14 flex items-center justify-between px-5 border-t border-slate-800/80 bg-[#0d1117] flex-shrink-0">
        <div className="flex items-center gap-3 text-[10.5px] font-mono text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800 text-slate-400 normal-case tracking-normal">
              esc
            </kbd>
            cancel
          </span>
          <span className="text-slate-700">/</span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800 text-slate-400 normal-case tracking-normal">
              ⌘ ⏎
            </kbd>
            add constraint
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-sm text-[12px] text-slate-300 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent"
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={submit}
            className={`px-4 py-1.5 rounded-sm text-[12.5px] font-medium border transition ${
              valid
                ? "bg-slate-100 text-slate-900 border-slate-100 hover:bg-white"
                : "bg-slate-800/60 text-slate-500 border-slate-800/80 cursor-not-allowed"
            }`}
          >
            Add constraint
          </button>
        </div>
      </div>

      <KeyboardShortcuts onEsc={onCancel} onSubmit={submit} />
    </div>
  );
}

// ============================================================================
// Header chrome
// ============================================================================

interface BuilderHeaderProps {
  def: TypeDef;
  solved: Constraint;
  onCancel: () => void;
}

function BuilderHeader({ def, solved, onCancel }: BuilderHeaderProps) {
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

function LiveStatusPill({ solved }: { solved: Constraint }) {
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

// ============================================================================
// Form section helpers
// ============================================================================

interface FormSectionProps {
  label: string;
  kbd?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({ label, kbd, action, children }: FormSectionProps) {
  return (
    <section className="px-5 pt-4 pb-4 border-b border-slate-800/60">
      <div className="flex items-center justify-between mb-2.5 whitespace-nowrap">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">
            {label}
          </span>
          {kbd && (
            <span className="text-[9.5px] font-mono text-slate-600 tracking-tight truncate">
              {kbd}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

interface FormNameProps {
  value: string;
  onChange: (v: string) => void;
  autoName: string;
  touched: boolean;
  reset: () => void;
}

function FormName({ value, onChange, autoName, touched, reset }: FormNameProps) {
  return (
    <FormSection
      label="Name"
      kbd={touched ? "manual override" : "auto-derived"}
      action={
        touched ? (
          <button
            onClick={reset}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-200 uppercase tracking-widest"
          >
            reset
          </button>
        ) : undefined
      }
    >
      <input
        aria-label="Constraint name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="w-full px-3 py-2 rounded-sm bg-[#0a0e14] border border-slate-800/80 hover:border-slate-700 focus:border-slate-500 focus:outline-none text-[13px] font-mono text-slate-100 placeholder-slate-600 transition"
        placeholder={autoName}
      />
    </FormSection>
  );
}

interface FormTypeProps {
  value: ConstraintType;
  onChange: (v: ConstraintType) => void;
}

function FormType({ value, onChange }: FormTypeProps) {
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

interface FormSignalRefProps {
  label: string;
  kbd?: string;
  value: SignalReference;
  onChange: (v: SignalReference) => void;
  signals: AnySignal[];
  disabled?: boolean;
  accent: string;
}

function FormSignalRef({
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
      : sig?.widthBits
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

function describeRef(ref: SignalReference, sig: AnySignal | undefined): string {
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

interface FormBoundsProps {
  def: TypeDef;
  minNs: string;
  maxNs: string;
  setMinNs: (v: string) => void;
  setMaxNs: (v: string) => void;
}

function FormBounds({ def, minNs, maxNs, setMinNs, setMaxNs }: FormBoundsProps) {
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

function BoundInput({ label, unit, value, onChange, dim, symbol }: BoundInputProps) {
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

// ============================================================================
// Preview block
// ============================================================================

interface PreviewHeaderProps {
  def: TypeDef;
}

function PreviewHeader({ def }: PreviewHeaderProps) {
  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800/80 flex-shrink-0 bg-[#0a0e14]">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        live waveform preview
      </div>
      <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-500">
        <span>solver: cycle-accurate</span>
        <span className="text-slate-700">·</span>
        <span>{def.inequality}</span>
      </div>
    </div>
  );
}

const PV = {
  pad: 28,
  rowH: 70,
  sigH: 28,
  headerH: 38,
} as const;

interface PreviewWaveformProps {
  draft: Constraint;
  solved: Constraint;
  signals: AnySignal[];
  def: TypeDef;
}

function PreviewWaveform({ draft, solved, signals, def }: PreviewWaveformProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(620);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aSig = signals.find((s) => s.id === draft.anchor.signalId);
  const tSig = signals.find((s) => s.id === draft.target.signalId);
  const isSingleRow = def.sameSignal || aSig?.id === tSig?.id;
  const rows: AnySignal[] = isSingleRow
    ? aSig
      ? [aSig]
      : []
    : [aSig, tSig].filter((s): s is AnySignal => !!s);

  const center = solved.worstWindow
    ? (solved.worstWindow.anchorTimeNs + solved.worstWindow.targetTimeNs) / 2
    : 50;
  const reach = solved.worstWindow
    ? Math.max(
        40,
        Math.abs(solved.worstWindow.anchorTimeNs - solved.worstWindow.targetTimeNs) * 3 + 20,
      )
    : 100;
  const tMin = Math.max(0, center - reach);
  const tMax = center + reach;
  const span = tMax - tMin;
  const plotW = Math.max(120, width - PV.pad * 2);
  const tToX = (t: number) => PV.pad + ((t - tMin) / span) * plotW;

  const totalH = PV.headerH + rows.length * PV.rowH + 8;

  const niceStep = useMemo(() => {
    const target = span / 6;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    return [1, 2, 5, 10].map((m) => m * pow).find((c) => c >= target) || pow;
  }, [span]);
  const ticks: number[] = [];
  for (let t = Math.ceil(tMin / niceStep) * niceStep; t <= tMax + 1e-6; t += niceStep) {
    ticks.push(Math.round(t * 1000) / 1000);
  }

  return (
    <div
      ref={wrapRef}
      className="w-full h-full overflow-hidden flex items-center"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <svg width={width} height={totalH} style={{ display: "block" }}>
        <defs>
          <marker
            id="cbArrR"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" />
          </marker>
          <marker
            id="cbArrL"
            viewBox="0 0 8 8"
            refX="1"
            refY="4"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M8 0 L0 4 L8 8 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Vertical grid */}
        {ticks.map((t) => (
          <line
            key={`g${t}`}
            x1={tToX(t)}
            x2={tToX(t)}
            y1={PV.headerH - 4}
            y2={totalH - 6}
            stroke="rgba(125,159,195,0.10)"
          />
        ))}
        {/* Tick labels */}
        {ticks.map((t) => (
          <text
            key={`tl${t}`}
            x={tToX(t)}
            y={PV.headerH - 12}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(180,200,220,0.55)"
          >
            {formatTime(t)}
          </text>
        ))}
        <line
          x1={0}
          x2={width}
          y1={PV.headerH}
          y2={PV.headerH}
          stroke="rgba(180,200,220,0.25)"
        />

        {/* Row backgrounds + labels */}
        {rows.map((sig, i) => {
          const y = PV.headerH + i * PV.rowH;
          const role = i === 0 ? "anchor" : "target";
          return (
            <g key={`rl${sig.id}-${i}`}>
              <rect
                x={0}
                y={y}
                width={width}
                height={PV.rowH}
                fill={
                  i === 0 ? "rgba(253, 224, 71, 0.02)" : "rgba(34, 211, 238, 0.02)"
                }
              />
              <text
                x={PV.pad}
                y={y + 16}
                fontSize="10.5"
                fill="rgba(180,200,220,0.55)"
                letterSpacing="0.05em"
              >
                <tspan fill={sig.color}>{sig.name}</tspan>
                <tspan dx="8" fill="rgba(125,159,195,0.7)" fontSize="9.5">
                  · {role}
                </tspan>
              </text>
            </g>
          );
        })}

        {/* Annotation BEHIND traces */}
        <PreviewAnnotation
          solved={solved}
          def={def}
          rows={rows}
          tToX={tToX}
          tMin={tMin}
          tMax={tMax}
        />

        {/* Traces — delegate to the shared canvas renderers */}
        {rows.map((sig, i) => {
          const yTop = PV.headerH + i * PV.rowH + (PV.rowH - PV.sigH) / 2;
          return (
            <PreviewTraceRow
              key={`tr${sig.id}-${i}`}
              sig={sig}
              yTop={yTop}
              tMin={tMin}
              tMax={tMax}
              tToX={tToX}
            />
          );
        })}

        {/* Event needles */}
        <EventNeedles
          draft={draft}
          signals={signals}
          tMin={tMin}
          tMax={tMax}
          tToX={tToX}
          rows={rows}
        />
      </svg>

      {!solved.worstWindow && rows.length > 0 && (
        <EmptyOverlay reason={solved.status} />
      )}
    </div>
  );
}

interface PreviewTraceRowProps {
  sig: AnySignal;
  yTop: number;
  tMin: number;
  tMax: number;
  tToX: (t: number) => number;
}

function PreviewTraceRow({ sig, yTop, tMin, tMax, tToX }: PreviewTraceRowProps) {
  const sigH = PV.sigH;
  if (sig.type === "CLOCK") {
    return <ClockTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  const isBus =
    (sig.widthBits != null && sig.widthBits > 1) ||
    sig.transitions.some(
      (t) =>
        t.newState === "VALID" ||
        t.newState === "INVALID" ||
        t.newState === "HIGH_Z",
    );
  if (isBus) {
    return <BusTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  return <LineTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
}

interface PreviewAnnotationProps {
  solved: Constraint;
  def: TypeDef;
  rows: AnySignal[];
  tToX: (t: number) => number;
  tMin: number;
  tMax: number;
}

function PreviewAnnotation({
  solved,
  def,
  rows,
  tToX,
  tMin,
  tMax,
}: PreviewAnnotationProps) {
  if (!solved.worstWindow) return null;
  const aTime = solved.worstWindow.anchorTimeNs;
  const tTime = solved.worstWindow.targetTimeNs;
  if (aTime < tMin || aTime > tMax || tTime < tMin || tTime > tMax) return null;

  const xa = tToX(aTime);
  const xb = tToX(tTime);
  const xMin = Math.min(xa, xb);
  const xMax = Math.max(xa, xb);

  const yTop = PV.headerH + 20;
  const yBot = PV.headerH + rows.length * PV.rowH - 16;
  const midY = (yTop + yBot) / 2;

  const pass = solved.status === "PASS";
  const color = pass ? "#34d399" : "#f87171";
  const colorWeak = pass ? "rgba(52, 211, 153, 0.12)" : "rgba(248, 113, 113, 0.14)";

  const delta = Math.abs(tTime - aTime);
  const reqLabel =
    def.bounds === "min"
      ? `≥ ${solved.minNs ?? 0} ns`
      : `≤ ${solved.maxNs ?? 0} ns`;

  return (
    <g style={{ color }}>
      <rect
        x={xMin}
        y={yTop}
        width={xMax - xMin}
        height={yBot - yTop}
        fill={colorWeak}
      />
      <line
        x1={xa}
        x2={xa}
        y1={yTop - 8}
        y2={yBot + 8}
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />
      <line
        x1={xb}
        x2={xb}
        y1={yTop - 8}
        y2={yBot + 8}
        stroke={color}
        strokeWidth="1.2"
        strokeDasharray="3 2"
      />

      <text
        x={xa}
        y={yTop - 12}
        textAnchor="middle"
        fontSize="9.5"
        fill="rgba(180,200,220,0.7)"
      >
        anchor · {formatTime(aTime)}
      </text>
      <text
        x={xb}
        y={yTop - 12}
        textAnchor="middle"
        fontSize="9.5"
        fill="rgba(180,200,220,0.7)"
      >
        target · {formatTime(tTime)}
      </text>

      <line
        x1={xMin + 2}
        x2={xMax - 2}
        y1={midY}
        y2={midY}
        stroke={color}
        strokeWidth="1.5"
        markerStart="url(#cbArrL)"
        markerEnd="url(#cbArrR)"
      />

      <g transform={`translate(${(xMin + xMax) / 2}, ${midY})`}>
        <rect
          x={-72}
          y={-16}
          width={144}
          height={32}
          rx="2"
          fill="#0a0e14"
          stroke={color}
          strokeOpacity="0.7"
        />
        <text
          x={0}
          y={-2}
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="600"
          fill={color}
        >
          {`Δ ${delta.toFixed(1)} ns`}
        </text>
        <text
          x={0}
          y={11}
          textAnchor="middle"
          fontSize="9.5"
          fill="rgba(180,200,220,0.6)"
        >
          req {reqLabel} · slack {formatSlack(solved)}
        </text>
      </g>
    </g>
  );
}

function formatSlack(solved: Constraint): string {
  if (solved.calculatedMarginNs == null) return "—";
  let slack: number | null = null;
  if (solved.minNs != null) slack = solved.calculatedMarginNs - solved.minNs;
  else if (solved.maxNs != null) slack = solved.maxNs - solved.calculatedMarginNs;
  if (slack == null) return "—";
  return `${slack >= 0 ? "+" : ""}${slack.toFixed(1)} ns`;
}

interface EventNeedlesProps {
  draft: Constraint;
  signals: AnySignal[];
  tMin: number;
  tMax: number;
  tToX: (t: number) => number;
  rows: AnySignal[];
}

function EventNeedles({
  draft,
  signals,
  tMin,
  tMax,
  tToX,
  rows,
}: EventNeedlesProps) {
  const aSig = signals.find((s) => s.id === draft.anchor.signalId);
  const tSig = signals.find((s) => s.id === draft.target.signalId);

  const dotsFor = (
    sig: AnySignal,
    ref: SignalReference,
    rowIdx: number,
    color: string,
  ) => {
    const evts: ResolvedEvent[] = resolveReference(ref, sig, tMax);
    return evts
      .filter((e) => e.midNs >= tMin && e.midNs <= tMax)
      .map((e, k) => {
        const cx = tToX(e.midNs);
        const cy = PV.headerH + rowIdx * PV.rowH + PV.rowH / 2;
        return (
          <circle
            key={`${sig.id}-${ref.edgeDirection}-${k}`}
            cx={cx}
            cy={cy}
            r="3"
            fill="#0a0e14"
            stroke={color}
            strokeWidth="1.5"
          />
        );
      });
  };

  const dots: React.ReactNode[] = [];
  if (aSig) dots.push(...dotsFor(aSig, draft.anchor, 0, "#fde047"));
  if (tSig && tSig.id !== aSig?.id) {
    dots.push(...dotsFor(tSig, draft.target, rows.length > 1 ? 1 : 0, "#22d3ee"));
  }

  return <g opacity="0.85">{dots}</g>;
}

interface EmptyOverlayProps {
  reason?: Constraint["status"];
}

function EmptyOverlay({ reason }: EmptyOverlayProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="px-4 py-2 rounded-sm border border-slate-800/80 bg-[#0a0e14]/90 text-[11px] font-mono text-slate-500 text-center">
        no matching anchor / target events in the window
        <div className="text-[10px] text-slate-600 mt-0.5">
          {reason ?? "UNRESOLVED"} · try a different edge direction
        </div>
      </div>
    </div>
  );
}

interface PreviewFooterProps {
  solved: Constraint;
  def: TypeDef;
  draft: Constraint;
}

function PreviewFooter({ solved, def, draft }: PreviewFooterProps) {
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

function Metric({ label, value, accent = "text-slate-100" }: MetricProps) {
  return (
    <div className="flex flex-col">
      <span className="text-[9.5px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className={`text-[14px] font-mono mt-1 ${accent}`}>{value}</span>
    </div>
  );
}

// ============================================================================
// Keyboard shortcuts: Esc closes, Cmd/Ctrl+Enter submits
// ============================================================================

interface KeyboardShortcutsProps {
  onEsc: () => void;
  onSubmit: () => void;
}

function KeyboardShortcuts({ onEsc, onSubmit }: KeyboardShortcutsProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onEsc();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onSubmit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEsc, onSubmit]);
  return null;
}
