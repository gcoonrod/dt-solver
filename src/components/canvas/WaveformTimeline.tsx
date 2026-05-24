"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { generateClockEdges, stateAt } from "@/core/solver";
import { useTimingStore } from "@/store/useTimingStore";
import type {
  AnySignal,
  ClockSignal,
  DataSignal,
  SignalState,
} from "@/types/signal";

// ---- layout constants -----------------------------------------------------
export const ROW_H = 44;
const SIG_H = 24;
export const HEADER_H = 36;
const LEFT_PAD = 18;
const RIGHT_PAD = 32;
// Pixel offset used only for *zero-slew* edges so they don't render as a
// perfectly vertical line (purely cosmetic / anti-aliasing). Sloped edges
// derive their width from the signal's rise/fall time instead.
const ZERO_SLEW_PX = 1.2;
const ZERO_SLEW_BUS_PX = 3;

// ---- colors ---------------------------------------------------------------
const SCOPE_BG = "#0a0e14";
const GRID_MAJOR = "rgba(125, 159, 195, 0.18)";
const GRID_MINOR = "rgba(125, 159, 195, 0.07)";
const AXIS = "rgba(180, 200, 220, 0.55)";
const TEXT_DIM = "rgba(180, 200, 220, 0.55)";
const HZ_DASHED_OPACITY = 0.55;

// ---- value formatter ------------------------------------------------------
export function formatTime(t: number): string {
  if (Math.abs(t) < 0.0005) return "0 ns";
  if (Math.abs(t) >= 1000) return `${(t / 1000).toFixed(2)} µs`;
  if (Math.abs(t) >= 10) return `${t.toFixed(0)} ns`;
  if (Math.abs(t) >= 1) return `${t.toFixed(1)} ns`;
  return `${(t * 1000).toFixed(0)} ps`;
}

// ---- helper types ---------------------------------------------------------
interface Highlight {
  a: number;
  b: number;
  anchorId: string;
  targetId: string;
  pass: boolean;
}

interface RowGeometry {
  yTop: number;
  sigH: number;
  tMin: number;
  tMax: number;
  tToX: (t: number) => number;
}

// ==========================================================================
// Main component
// ==========================================================================
export default function WaveformTimeline() {
  const signals = useTimingStore((s) => s.signals);
  const solved = useTimingStore((s) => s.solved);
  const tMinNs = useTimingStore((s) => s.tMinNs);
  const tMaxNs = useTimingStore((s) => s.tMaxNs);
  const cursorTimeNs = useTimingStore((s) => s.cursorTimeNs);
  const hoveredId = useTimingStore((s) => s.hoveredConstraintId);
  const setCursor = useTimingStore((s) => s.setCursor);
  const zoomAt = useTimingStore((s) => s.zoomAt);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(900);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotW = Math.max(200, width - LEFT_PAD - RIGHT_PAD);
  const span = tMaxNs - tMinNs;
  const tToX = useCallback(
    (t: number) => LEFT_PAD + ((t - tMinNs) / span) * plotW,
    [tMinNs, span, plotW],
  );
  const xToT = useCallback(
    (x: number) => tMinNs + ((x - LEFT_PAD) / plotW) * span,
    [tMinNs, span, plotW],
  );
  const totalH = HEADER_H + signals.length * ROW_H + 6;

  const niceStep = useMemo(() => {
    const target = span / 10;
    const pow = Math.pow(10, Math.floor(Math.log10(target)));
    const candidates = [1, 2, 5, 10].map((m) => m * pow);
    return candidates.find((c) => c >= target) || pow;
  }, [span]);

  const majorTicks: number[] = [];
  for (let t = Math.ceil(tMinNs / niceStep) * niceStep; t <= tMaxNs + 1e-6; t += niceStep) {
    majorTicks.push(Math.round(t * 1000) / 1000);
  }
  const minorTicks: number[] = [];
  const minorStep = niceStep / 5;
  for (let t = Math.ceil(tMinNs / minorStep) * minorStep; t <= tMaxNs + 1e-6; t += minorStep) {
    minorTicks.push(Math.round(t * 1000) / 1000);
  }

  const highlight = useMemo<Highlight | null>(() => {
    if (!hoveredId) return null;
    const c = solved.find((x) => x.id === hoveredId);
    if (!c || !c.worstWindow) return null;
    return {
      a: c.worstWindow.anchorTimeNs,
      b: c.worstWindow.targetTimeNs,
      anchorId: c.anchor.signalId,
      targetId: c.target.signalId,
      pass: c.status === "PASS",
    };
  }, [hoveredId, solved]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < LEFT_PAD || x > LEFT_PAD + plotW) return;
    setCursor(Math.max(tMinNs, Math.min(tMaxNs, xToT(x))));
  };
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;
    e.preventDefault();
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tAt = xToT(e.clientX - rect.left);
    zoomAt(tAt, e.deltaY > 0 ? 1.15 : 1 / 1.15);
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-full select-none"
      style={{ background: SCOPE_BG, fontFamily: "var(--font-mono)" }}
      onMouseMove={handleMove}
      onWheel={handleWheel}
    >
      <svg width={width} height={totalH} style={{ display: "block" }}>
        <defs>
          <marker id="arrR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" />
          </marker>
          <marker id="arrL" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M8 0 L0 4 L8 8 Z" />
          </marker>
        </defs>

        {/* Minor vertical grid */}
        {minorTicks.map((t) => (
          <line
            key={`mn${t}`}
            x1={tToX(t)}
            x2={tToX(t)}
            y1={HEADER_H}
            y2={totalH}
            stroke={GRID_MINOR}
            strokeWidth="1"
          />
        ))}
        {/* Major vertical grid */}
        {majorTicks.map((t) => (
          <line
            key={`mj${t}`}
            x1={tToX(t)}
            x2={tToX(t)}
            y1={HEADER_H - 4}
            y2={totalH}
            stroke={GRID_MAJOR}
            strokeWidth="1"
          />
        ))}

        {/* Row separators */}
        {signals.map((sig, i) => (
          <line
            key={`sep-${sig.id}`}
            x1={0}
            x2={width}
            y1={HEADER_H + i * ROW_H + ROW_H}
            y2={HEADER_H + i * ROW_H + ROW_H}
            stroke="rgba(125,159,195,0.06)"
            strokeWidth="1"
          />
        ))}

        {/* Time-axis labels */}
        {majorTicks.map((t) => (
          <text
            key={`lab${t}`}
            x={tToX(t)}
            y={HEADER_H - 12}
            textAnchor="middle"
            fontSize="10.5"
            fontFamily="var(--font-mono)"
            fill={TEXT_DIM}
          >
            {formatTime(t)}
          </text>
        ))}
        <line x1={0} x2={width} y1={HEADER_H} y2={HEADER_H} stroke={AXIS} strokeOpacity="0.35" />

        {/* Highlight band for hovered constraint */}
        {highlight && (
          <ConstraintAnnotation highlight={highlight} signals={signals} tToX={tToX} />
        )}

        {/* Signal traces */}
        {signals.map((sig, i) => (
          <SignalRow
            key={sig.id}
            sig={sig}
            yTop={HEADER_H + i * ROW_H + (ROW_H - SIG_H) / 2}
            sigH={SIG_H}
            tMin={tMinNs}
            tMax={tMaxNs}
            tToX={tToX}
          />
        ))}

        {/* Cursor */}
        {cursorTimeNs != null && cursorTimeNs >= tMinNs && cursorTimeNs <= tMaxNs && (
          <g>
            <line
              x1={tToX(cursorTimeNs)}
              x2={tToX(cursorTimeNs)}
              y1={HEADER_H - 6}
              y2={totalH}
              stroke="#fde047"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.85"
            />
            <rect
              x={tToX(cursorTimeNs) - 30}
              y={4}
              width={60}
              height={20}
              fill="#11161e"
              stroke="#fde047"
              strokeOpacity="0.5"
              rx="2"
            />
            <text
              x={tToX(cursorTimeNs)}
              y={18}
              textAnchor="middle"
              fontSize="11"
              fontFamily="var(--font-mono)"
              fill="#fde047"
            >
              {formatTime(cursorTimeNs)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ==========================================================================
// Per-signal trace
// ==========================================================================
interface SignalRowProps extends RowGeometry {
  sig: AnySignal;
}

function SignalRow({ sig, yTop, sigH, tMin, tMax, tToX }: SignalRowProps) {
  if (sig.type === "CLOCK") {
    return <ClockTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  // Bus vs single-bit line. Bus if widthBits>1 or any VALID/INVALID/HIGH_Z states.
  const isBus =
    (sig.widthBits != null && sig.widthBits > 1) ||
    sig.transitions.some(
      (t) => t.newState === "VALID" || t.newState === "INVALID" || t.newState === "HIGH_Z",
    );
  if (isBus) {
    return <BusTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
  }
  return <LineTrace sig={sig} yTop={yTop} sigH={sigH} tMin={tMin} tMax={tMax} tToX={tToX} />;
}

// ---- Clock ---------------------------------------------------------------
export interface ClockTraceProps extends RowGeometry {
  sig: ClockSignal;
}

/** Internal trace renderer; reused by ConstraintBuilder's preview. Not a stable external API. */
export function ClockTrace({ sig, yTop, sigH, tMin, tMax, tToX }: ClockTraceProps) {
  const yHigh = yTop;
  const yLow = yTop + sigH;
  const edges = generateClockEdges(sig, tMin, tMax);
  const v0 = stateAt(sig, tMin).state === "HIGH";
  let y = v0 ? yHigh : yLow;
  const pts: [number, number][] = [[tToX(tMin), y]];
  for (const e of edges) {
    const isZeroSlew = e.endNs === e.startNs;
    const xS = isZeroSlew ? tToX(e.midNs) - ZERO_SLEW_PX : tToX(e.startNs);
    const xE = isZeroSlew ? tToX(e.midNs) + ZERO_SLEW_PX : tToX(e.endNs);
    pts.push([xS, y]);
    y = e.direction === "RISING" ? yHigh : yLow;
    pts.push([xE, y]);
  }
  pts.push([tToX(tMax), y]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
  return <path d={d} stroke={sig.color} strokeWidth="1.5" fill="none" />;
}

// ---- Single-bit line trace -----------------------------------------------
export interface LineTraceProps extends RowGeometry {
  sig: DataSignal;
}

/** Internal trace renderer; reused by ConstraintBuilder's preview. Not a stable external API. */
export function LineTrace({ sig, yTop, sigH, tMin, tMax, tToX }: LineTraceProps) {
  const yHigh = yTop;
  const yLow = yTop + sigH;
  const startState = stateAt(sig, tMin).state;
  let y = startState === "HIGH" ? yHigh : yLow;
  const pts: [number, number][] = [[tToX(tMin), y]];
  for (const tr of sig.transitions) {
    if (tr.timeNs <= tMin || tr.timeNs > tMax) continue;
    const slew =
      tr.direction === "RISING"
        ? sig.riseTimeNs ?? 0
        : tr.direction === "FALLING"
          ? sig.fallTimeNs ?? 0
          : Math.max(sig.riseTimeNs ?? 0, sig.fallTimeNs ?? 0);
    const isZeroSlew = slew === 0;
    const xS = isZeroSlew ? tToX(tr.timeNs) - ZERO_SLEW_PX : tToX(tr.timeNs - slew / 2);
    const xE = isZeroSlew ? tToX(tr.timeNs) + ZERO_SLEW_PX : tToX(tr.timeNs + slew / 2);
    pts.push([xS, y]);
    y = tr.newState === "HIGH" ? yHigh : yLow;
    pts.push([xE, y]);
  }
  pts.push([tToX(tMax), y]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
  return <path d={d} stroke={sig.color} strokeWidth="1.5" fill="none" />;
}

// ---- Bus trace ------------------------------------------------------------
export interface BusTraceProps extends RowGeometry {
  sig: DataSignal;
}

interface BusSegment {
  from: number;
  to: number;
  state: SignalState;
  value?: string;
}

/** Internal trace renderer; reused by ConstraintBuilder's preview. Not a stable external API. */
export function BusTrace({ sig, yTop, sigH, tMin, tMax, tToX }: BusTraceProps) {
  const yHigh = yTop;
  const yLow = yTop + sigH;
  const yMid = yTop + sigH / 2;

  // Bus transitions are direction=TRANSITION; the solver treats their slew as
  // max(rise, fall). Mirror that here so the X marker width matches the
  // conservative interval the solver evaluates against.
  const busSlewNs = Math.max(sig.riseTimeNs ?? 0, sig.fallTimeNs ?? 0);
  const halfSlewPx = (t: number) =>
    busSlewNs === 0 ? ZERO_SLEW_BUS_PX : (tToX(t + busSlewNs / 2) - tToX(t - busSlewNs / 2)) / 2;

  const initial = stateAt(sig, tMin);
  let prevT = tMin;
  let prevState: SignalState = initial.state;
  let prevValue: string | undefined = initial.value;
  const segs: BusSegment[] = [];

  for (const tr of sig.transitions) {
    if (tr.timeNs <= tMin) {
      prevState = tr.newState;
      prevValue = tr.value;
      continue;
    }
    if (tr.timeNs > tMax) break;
    segs.push({ from: prevT, to: tr.timeNs, state: prevState, value: prevValue });
    prevT = tr.timeNs;
    prevState = tr.newState;
    prevValue = tr.value;
  }
  segs.push({ from: prevT, to: tMax, state: prevState, value: prevValue });

  const elems: React.ReactNode[] = [];
  segs.forEach((seg, i) => {
    const x1 = tToX(seg.from);
    const x2 = tToX(seg.to);
    const isFirst = i === 0;
    const isLast = i === segs.length - 1;
    const leftHalf = isFirst ? 0 : halfSlewPx(seg.from);
    const rightHalf = isLast ? 0 : halfSlewPx(seg.to);
    const xS = x1 + leftHalf;
    const xE = x2 - rightHalf;
    const w = Math.max(0, xE - xS);

    const isHiZ = seg.state === "HIGH_Z";
    const isInv = seg.state === "INVALID";

    if (isHiZ) {
      elems.push(
        <line
          key={`hz${i}`}
          x1={xS}
          x2={xE}
          y1={yMid}
          y2={yMid}
          stroke={sig.color}
          strokeWidth="1.2"
          strokeDasharray="4 3"
          opacity={HZ_DASHED_OPACITY}
        />,
      );
    } else if (isInv) {
      elems.push(
        <g key={`inv${i}`}>
          <rect x={xS} y={yHigh} width={w} height={yLow - yHigh} fill={sig.color} opacity="0.06" />
          <path d={`M${xS} ${yHigh} L${xE} ${yHigh}`} stroke={sig.color} strokeWidth="1.2" opacity="0.7" />
          <path d={`M${xS} ${yLow} L${xE} ${yLow}`} stroke={sig.color} strokeWidth="1.2" opacity="0.7" />
          <line
            x1={xS}
            x2={xE}
            y1={yMid}
            y2={yMid}
            stroke={sig.color}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.5"
          />
        </g>,
      );
    } else {
      elems.push(
        <g key={`vs${i}`}>
          <rect x={xS} y={yHigh} width={w} height={yLow - yHigh} fill={sig.color} opacity="0.08" />
          <path d={`M${xS} ${yHigh} L${xE} ${yHigh}`} stroke={sig.color} strokeWidth="1.5" fill="none" />
          <path d={`M${xS} ${yLow}  L${xE} ${yLow}`} stroke={sig.color} strokeWidth="1.5" fill="none" />
          {seg.value && w > 28 && (
            <text
              x={(xS + xE) / 2}
              y={yMid + 3.5}
              textAnchor="middle"
              fontSize="10.5"
              fontFamily="var(--font-mono)"
              fill={sig.color}
            >
              {seg.value}
            </text>
          )}
        </g>,
      );
    }

    if (!isLast) {
      const xc = tToX(seg.to);
      const xHalf = halfSlewPx(seg.to);
      const next = segs[i + 1];
      const dim = isHiZ || next.state === "HIGH_Z" || isInv || next.state === "INVALID";
      elems.push(
        <path
          key={`x${i}`}
          d={`M${xc - xHalf} ${yHigh} L${xc + xHalf} ${yLow} M${xc - xHalf} ${yLow} L${xc + xHalf} ${yHigh}`}
          stroke={sig.color}
          strokeWidth="1.5"
          opacity={dim ? 0.55 : 1}
          fill="none"
        />,
      );
    }
  });

  return <g>{elems}</g>;
}

// ==========================================================================
// Constraint margin annotation
// ==========================================================================
interface ConstraintAnnotationProps {
  highlight: Highlight;
  signals: AnySignal[];
  tToX: (t: number) => number;
}

function ConstraintAnnotation({ highlight, signals, tToX }: ConstraintAnnotationProps) {
  const { a, b, anchorId, targetId, pass } = highlight;
  if (a == null || b == null) return null;
  const aIdx = signals.findIndex((s) => s.id === anchorId);
  const tIdx = signals.findIndex((s) => s.id === targetId);
  if (aIdx < 0 || tIdx < 0) return null;
  const yTop = HEADER_H + Math.min(aIdx, tIdx) * ROW_H + 4;
  const yBot = HEADER_H + (Math.max(aIdx, tIdx) + 1) * ROW_H - 4;
  const xa = tToX(a);
  const xb = tToX(b);
  const midY = (yTop + yBot) / 2;
  const color = pass ? "#34d399" : "#f87171";
  return (
    <g style={{ color }}>
      <rect
        x={Math.min(xa, xb)}
        y={yTop}
        width={Math.abs(xb - xa)}
        height={yBot - yTop}
        fill={color}
        opacity="0.10"
      />
      <line x1={xa} x2={xa} y1={yTop} y2={yBot} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <line x1={xb} x2={xb} y1={yTop} y2={yBot} stroke={color} strokeWidth="1.2" strokeDasharray="3 2" />
      <line
        x1={xa}
        x2={xb}
        y1={midY}
        y2={midY}
        stroke={color}
        strokeWidth="1.5"
        markerStart="url(#arrL)"
        markerEnd="url(#arrR)"
        style={{ fill: color }}
      />
      <rect
        x={(xa + xb) / 2 - 36}
        y={midY - 18}
        width={72}
        height={14}
        rx="2"
        fill="#0a0e14"
        stroke={color}
        strokeOpacity="0.6"
      />
      <text
        x={(xa + xb) / 2}
        y={midY - 8}
        textAnchor="middle"
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill={color}
      >
        Δ {Math.abs(b - a).toFixed(1)} ns
      </text>
    </g>
  );
}
