"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BusTrace,
  ClockTrace,
  formatTime,
  LineTrace,
} from "@/components/canvas/WaveformTimeline";
import { resolveReference, type ResolvedEvent } from "@/core/solver";
import type { Constraint, SignalReference } from "@/types/constraint";
import type { AnySignal } from "@/types/signal";

import type { TypeDef } from "./constants";

// ============================================================================
// Preview header
// ============================================================================

interface PreviewHeaderProps {
  def: TypeDef;
}

export function PreviewHeader({ def }: PreviewHeaderProps) {
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

// ============================================================================
// Preview waveform
// ============================================================================

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

export function PreviewWaveform({ draft, solved, signals, def }: PreviewWaveformProps) {
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

// ============================================================================
// Sub-components
// ============================================================================

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
  if (sig.type === "BUS") {
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

export function formatSlack(solved: Constraint): string {
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
