"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  BusTrace,
  ClockTrace,
  LineTrace,
} from "@/components/canvas/WaveformTimeline";
import type {
  AnySignal,
  BusSignal,
  ClockSignal,
  LineSignal,
  SignalTypeId,
} from "@/types/signal";

import { sbFormatTickWithStep, sbFormatTime, type SBTypeDef } from "./constants";

// ============================================================================
// Preview header
// ============================================================================

export function SBPreviewHeader({ def }: { def: SBTypeDef }) {
  return (
    <div className="h-10 flex items-center justify-between px-4 border-b border-slate-800/80 flex-shrink-0 bg-[#0a0e14]">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        live waveform preview
      </div>
      <div className="flex items-center gap-2 text-[10.5px] font-mono text-slate-500">
        <span>{def.label} signal</span>
      </div>
    </div>
  );
}

// ============================================================================
// Preview waveform
// ============================================================================

const PV_SB = { pad: 28, headerH: 38 } as const;

interface SBPreviewWaveformProps {
  draft: AnySignal;
  typeId: SignalTypeId;
}

export default function SBPreviewWaveform({ draft, typeId }: SBPreviewWaveformProps) {
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

  const isClock = typeId === "CLOCK";
  const rowH = isClock ? 140 : 80;
  const sigH = isClock ? 28 : 28;

  const { tMin, tMax } = useMemo(() => {
    if (isClock && draft.type === "CLOCK") {
      const freq = draft.frequencyMHz;
      if (freq > 0 && Number.isFinite(freq)) {
        const T = 1000 / freq;
        return { tMin: -T, tMax: 2 * T };
      }
      return { tMin: -100, tMax: 200 };
    }
    // DATA signals: fit around transitions
    const dataDraft = draft as LineSignal | BusSignal;
    const times = dataDraft.transitions.map((t) => t.timeNs);
    if (times.length === 0) return { tMin: -10, tMax: 100 };
    const lo = Math.min(...times);
    const hi = Math.max(...times);
    const margin = Math.max(20, (hi - lo) * 0.25);
    return { tMin: lo - margin, tMax: hi + margin };
  }, [isClock, draft]);

  const span = tMax - tMin;
  const plotW = Math.max(120, width - PV_SB.pad * 2);
  const tToX = (t: number) => PV_SB.pad + ((t - tMin) / span) * plotW;
  const totalH = PV_SB.headerH + rowH + 8;

  const niceStep = useMemo(() => {
    const target = span / 6;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    return [1, 2, 5, 10].map((m) => m * pow).find((c) => c >= target) || pow;
  }, [span]);
  const ticks: number[] = [];
  for (let t = Math.ceil(tMin / niceStep) * niceStep; t <= tMax + 1e-6; t += niceStep) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }

  const yTop = PV_SB.headerH + (rowH - sigH) / 2;
  const showT0 = tMin < 0 && tMax > 0;

  return (
    <div ref={wrapRef} className="w-full h-full overflow-hidden flex items-center" style={{ fontFamily: "var(--font-mono)" }}>
      <svg width={width} height={totalH} style={{ display: "block" }}>
        <defs>
          <marker id="sbArrR" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L6 3 L0 6 Z" fill="currentColor" />
          </marker>
          <marker id="sbArrL" viewBox="0 0 6 6" refX="1" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M6 0 L0 3 L6 6 Z" fill="currentColor" />
          </marker>
        </defs>

        {/* Grid */}
        {ticks.map((t) => (
          <line key={`g${t}`} x1={tToX(t)} x2={tToX(t)} y1={PV_SB.headerH - 4} y2={totalH - 6} stroke="rgba(125,159,195,0.10)" />
        ))}
        {ticks.map((t) => (
          <text key={`tl${t}`} x={tToX(t)} y={PV_SB.headerH - 12} textAnchor="middle" fontSize="10" fill="rgba(180,200,220,0.55)">
            {sbFormatTickWithStep(t, niceStep)}
          </text>
        ))}
        <line x1={0} x2={width} y1={PV_SB.headerH} y2={PV_SB.headerH} stroke="rgba(180,200,220,0.25)" />

        {/* Row bg + label */}
        <rect x={0} y={PV_SB.headerH} width={width} height={rowH} fill="rgba(34, 211, 238, 0.02)" />
        <text x={PV_SB.pad} y={PV_SB.headerH + 16} fontSize="10.5" fill="rgba(180,200,220,0.55)" letterSpacing="0.05em">
          <tspan fill={draft.color}>{draft.name}</tspan>
          <tspan dx="8" fill="rgba(125,159,195,0.7)" fontSize="9.5">· preview</tspan>
        </text>

        {/* t=0 reference line */}
        {showT0 && (
          <g>
            <line x1={tToX(0)} x2={tToX(0)} y1={PV_SB.headerH} y2={PV_SB.headerH + rowH} stroke="rgba(180,200,220,0.45)" strokeWidth="1.2" />
            <text x={tToX(0)} y={PV_SB.headerH + 12} textAnchor="middle" fontSize="9" fill="rgba(180,200,220,0.55)">t₀</text>
          </g>
        )}

        {/* Trace */}
        <SBPreviewTrace draft={draft} typeId={typeId} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />

        {/* Clock rulers */}
        {isClock && draft.type === "CLOCK" && draft.frequencyMHz > 0 && Number.isFinite(draft.frequencyMHz) && (
          <SBClockRulers
            clock={draft}
            yTop={yTop}
            sigH={sigH}
            tToX={tToX}
          />
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// Preview trace dispatch
// ============================================================================

interface SBPreviewTraceProps {
  draft: AnySignal;
  typeId: SignalTypeId;
  yTop: number;
  sigH: number;
  tMin: number;
  tMax: number;
  tToX: (t: number) => number;
}

function SBPreviewTrace({ draft, typeId, yTop, sigH, tMin, tMax, tToX }: SBPreviewTraceProps) {
  if (typeId === "CLOCK" && draft.type === "CLOCK") {
    return <ClockTrace sig={draft} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  if (typeId === "BUS") {
    return <BusTrace sig={draft as BusSignal} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  return <LineTrace sig={draft as LineSignal} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
}

// ============================================================================
// Clock rulers
// ============================================================================

interface SBClockRulersProps {
  clock: ClockSignal;
  yTop: number;
  sigH: number;
  tToX: (t: number) => number;
}

function SBClockRulers({ clock, yTop, sigH, tToX }: SBClockRulersProps) {
  const T = 1000 / clock.frequencyMHz;
  const highDur = clock.dutyCycle * T;
  const phase = clock.phaseOffsetNs || 0;
  const phaseMod = ((phase % T) + T) % T;
  const targetRise = phase >= 0 || phaseMod === 0 ? phaseMod : phaseMod - T;
  const firstFall = targetRise + highDur;
  const nextRise = targetRise + T;

  const yAbove = yTop - 11;
  const yBelow = yTop + sigH + 12;
  const yPhase = yBelow + 18;

  const showPhase = Math.abs(phase) > 1e-9;

  return (
    <g>
      {/* Period ruler above */}
      <SBRulerBracket x1={tToX(targetRise)} x2={tToX(nextRise)} y={yAbove} color="#94a3b8" label={`T = ${sbFormatTime(T)}`} />

      {/* High-duration ruler below */}
      <SBRulerBracket x1={tToX(targetRise)} x2={tToX(firstFall)} y={yBelow} color={clock.color || "#22d3ee"} label={`tH = ${sbFormatTime(highDur)}`} />

      {/* Low-duration ruler below */}
      <SBRulerBracket x1={tToX(firstFall)} x2={tToX(nextRise)} y={yBelow} color="#94a3b8" label={`tL = ${sbFormatTime(T - highDur)}`} />

      {/* Phase ruler */}
      {showPhase && (
        <SBRulerBracket x1={tToX(0)} x2={tToX(targetRise)} y={yPhase} color="#fde047" label={`φ = ${sbFormatTime(phase)}`} dashed />
      )}
    </g>
  );
}

// ============================================================================
// Ruler bracket
// ============================================================================

interface SBRulerBracketProps {
  x1: number;
  x2: number;
  y: number;
  color: string;
  label: string;
  dashed?: boolean;
}

function SBRulerBracket({ x1, x2, y, color, label, dashed }: SBRulerBracketProps) {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const w = right - left;
  const showLabel = w >= 22;
  const mid = (left + right) / 2;

  return (
    <g style={{ color }}>
      {/* End ticks */}
      <line x1={left} x2={left} y1={y - 2} y2={y + 2} stroke={color} strokeWidth="1" />
      <line x1={right} x2={right} y1={y - 2} y2={y + 2} stroke={color} strokeWidth="1" />

      {/* Horizontal line */}
      <line
        x1={left + 1}
        x2={right - 1}
        y1={y}
        y2={y}
        stroke={color}
        strokeWidth="1"
        strokeDasharray={dashed ? "3 2" : undefined}
        markerStart="url(#sbArrL)"
        markerEnd="url(#sbArrR)"
      />

      {/* Label */}
      {showLabel && (
        <g>
          <rect x={mid - 44} y={y - 7} width={88} height={14} rx="2" fill="#0a0e14" fillOpacity="0.85" />
          <text x={mid} y={y + 3.5} textAnchor="middle" fontSize="9.5" fill={color} fontFamily="var(--font-mono)">
            {label}
          </text>
        </g>
      )}
    </g>
  );
}
