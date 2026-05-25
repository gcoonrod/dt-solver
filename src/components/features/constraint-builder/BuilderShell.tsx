"use client";

import { useMemo, useState } from "react";

import FormSection from "@/components/ui/FormSection";
import KeyboardShortcuts from "@/components/ui/KeyboardShortcuts";
import { evaluateConstraint } from "@/core/solver";
import type {
  Constraint,
  ConstraintType,
  SignalReference,
} from "@/types/constraint";
import type { AnySignal } from "@/types/signal";

import { BuilderHeader } from "./BuilderHeader";
import { TYPE_DEF_BY_ID } from "./constants";
import { FormBounds } from "./FormBounds";
import { FormSignalRef } from "./FormSignalRef";
import { FormType } from "./FormType";
import { PreviewFooter } from "./PreviewFooter";
import { PreviewHeader, PreviewWaveform } from "./PreviewWaveform";

// ============================================================================
// Shell — owns all form state. Every subcomponent gets exactly what it needs.
// ============================================================================

interface BuilderShellProps {
  signals: AnySignal[];
  initial: Constraint | null;
  onCancel: () => void;
  onSubmit: (c: Constraint) => void;
}

export function BuilderShell({ signals, initial, onCancel, onSubmit }: BuilderShellProps) {
  const [type, setType] = useState<ConstraintType>(initial?.type ?? "SETUP");

  // Lazy initializers — compute once at mount. Fresh values on every open are
  // guaranteed by ConstraintBuilder's early-return unmount (the shell is never
  // kept alive across close→open transitions).
  const [anchor, setAnchor] = useState<SignalReference>(() => {
    if (initial?.anchor) return initial.anchor;
    const clk = signals.find((s) => s.type === "CLOCK");
    if (clk) return { signalId: clk.id, edgeDirection: "FALLING" };
    return { signalId: signals[0]?.id ?? "", edgeDirection: "TRANSITION" };
  });

  const [target, setTarget] = useState<SignalReference>(() => {
    if (initial?.target) return initial.target;
    const dat = signals.find((s) => s.type !== "CLOCK");
    if (dat) return { signalId: dat.id, edgeDirection: "TRANSITION" };
    return {
      signalId: signals[1]?.id ?? signals[0]?.id ?? "",
      edgeDirection: "TRANSITION",
    };
  });
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
// FormName — kept here because it's tightly coupled to BuilderShell's state
// ============================================================================

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
