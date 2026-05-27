/**
 * dt-solver design tokens — codified.
 *
 * Mirrors `docs/design-system/tokens.md`. THAT FILE is the source of
 * truth; this one re-exports it for component code.
 *
 * If you add or change a value here, edit `tokens.md` in the same
 * commit and reference the change in your OpenSpec proposal.
 *
 * Naming: dotted in markdown → nested objects here.
 *   `color.surface.bg-1` → `color.surface.bg1`
 *   `swatch.prop-delay` → `swatch.propDelay`
 *   `recipe.status-pill` → `recipe.statusPill`
 */

// ─────────────────────────────────────────────────────────────────────
// 1 · color
// ─────────────────────────────────────────────────────────────────────

export const color = {
  surface: {
    bg0: '#0a0e14',
    bg1: '#0d1117',
    bg2: '#11161e',
  },
  line: {
    strong: 'rgba(30, 41, 59, 0.8)',
    med:    'rgba(30, 41, 59, 0.6)',
    weak:   'rgba(30, 41, 59, 0.4)',
  },
  text: {
    primary:     '#f1f5f9', // slate-100
    body:        '#cbd5e1', // slate-300
    secondary:   '#94a3b8', // slate-400
    caption:     '#64748b', // slate-500
    disabled:    '#475569', // slate-600
    placeholder: '#334155', // slate-700
  },
  status: {
    pass:       { hue: 'emerald', dot: '#34d399' },
    fail:       { hue: 'rose',    dot: '#f87171' },
    unresolved: { hue: 'amber',   dot: '#fbbf24' },
  },
  role: {
    anchor:      '#fde047',
    target:      '#22d3ee',
    anchorWash:  'rgba(253, 224, 71, 0.02)',
    targetWash:  'rgba(34, 211, 238, 0.02)',
  },
  signal: {
    palette: {
      cyan:   '#22d3ee',
      amber:  '#f59e0b',
      violet: '#a78bfa',
      pink:   '#f472b6',
      lime:   '#a3e635',
    },
  },
} as const;

export type StatusKey = keyof typeof color.status;

// ─────────────────────────────────────────────────────────────────────
// 1.7 · constraint type swatches
// ─────────────────────────────────────────────────────────────────────

/**
 * `swatch.<type>` — used by builder type chips and inspector inline chips.
 * Class strings render the recipe via Tailwind utilities so the type
 * chips read as one token in JSX:
 *
 *   <button className={swatch.setup.bg}>tSU · Setup</button>
 */
export const swatch = {
  setup:      { hue: 'sky',     bg: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
  hold:       { hue: 'violet',  bg: 'bg-violet-500/10 border-violet-500/30 text-violet-300' },
  propDelay:  { hue: 'amber',   bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
  minPulse:   { hue: 'emerald', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
  cycleTime:  { hue: 'slate',   bg: 'bg-slate-500/10 border-slate-500/40 text-slate-300' },
} as const;

export type SwatchKey = keyof typeof swatch;

// ─────────────────────────────────────────────────────────────────────
// 2 · type
// ─────────────────────────────────────────────────────────────────────

export const fontFamily = {
  sans: "'Geist', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

export const type = {
  title: {
    lg: { family: 'sans', size: 20,   weight: 500, tracking: 'tight' },
    md: { family: 'sans', size: 15,   weight: 500, tracking: 'tight' },
  },
  body: {
    md: { family: 'sans', size: 12.5, weight: 400, tracking: 'normal' },
    sm: { family: 'sans', size: 11,   weight: 400, tracking: 'normal' },
  },
  mono: {
    value:   { family: 'mono', size: 12,   weight: 400, tracking: 'normal' },
    caption: { family: 'mono', size: 10.5, weight: 400, tracking: 'normal' },
  },
  caption: {
    upper: { family: 'mono', size: 10,  weight: 500, tracking: '0.18em', textTransform: 'uppercase' as const },
    kbd:   { family: 'mono', size: 9.5, weight: 400, tracking: 'tight' },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// 3 · spacing
// ─────────────────────────────────────────────────────────────────────

export const space = {
  0: 0,
  2: 2,
  6: 6,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  28: 28,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 4 · radii / strokes / elevation
// ─────────────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm:   2,
  full: 9999,
} as const;

export const stroke = {
  hairline: `1px solid ${color.line.strong}`,
  divider:  `1px solid ${color.line.med}`,
  row:      `1px solid ${color.line.weak}`,
  trace:    1.6,
  icon:     1.75,
} as const;

export const elevation = {
  flat:     'none',
  modal:    '0 30px 90px -20px rgba(0, 0, 0, 0.8)',
  backdrop: { background: 'rgba(2, 6, 12, 0.66)', backdropFilter: 'blur(4px)' },
} as const;

// ─────────────────────────────────────────────────────────────────────
// 5 · recipes
// ─────────────────────────────────────────────────────────────────────

/**
 * Pill helper. Use as:
 *   <span className={`${recipe.statusPill('pass')} ${recipe.statusPill.container}`}>
 *     live · pass
 *   </span>
 */
const STATUS_PILL_CLASSES: Record<StatusKey, string> = {
  pass:       'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300',
  fail:       'bg-rose-500/10 border border-rose-500/30 text-rose-300',
  unresolved: 'bg-amber-500/10 border border-amber-500/30 text-amber-300',
};

const STATUS_DOT_CLASSES: Record<StatusKey, string> = {
  pass:       'w-1 h-1 rounded-full bg-emerald-400',
  fail:       'w-1 h-1 rounded-full bg-rose-400',
  unresolved: 'w-1 h-1 rounded-full bg-amber-400',
};

export const recipe = {
  statusPill: Object.assign(
    (status: StatusKey) => STATUS_PILL_CLASSES[status],
    {
      container: 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-mono text-[10.5px] uppercase tracking-widest',
      dot: (status: StatusKey) => STATUS_DOT_CLASSES[status],
    }
  ),

  swatchBg: (key: SwatchKey) => swatch[key].bg,

  signalDot: (signalColor: string, size = 8) => ({
    width: size, height: size, borderRadius: 9999,
    background: signalColor,
    boxShadow: `0 0 6px ${signalColor}80`,
    flexShrink: 0,
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────
// 6 · chrome sizes
// ─────────────────────────────────────────────────────────────────────

export const size = {
  toolbar:       40,
  modalBar:      56,
  footerStatus:  28,
  rowInspector:  40,
  rowWaveform:   70,
  rowWaveformTrace: 28,
  rowWaveformHeader: 38,
  sidebarW:      300,
  modalW:        1140,
  modalH:        860,
  previewHmin:   320,
} as const;

// ─────────────────────────────────────────────────────────────────────
// 8 · motion
// ─────────────────────────────────────────────────────────────────────

export const motion = {
  none:   { duration: 0,   property: 'none' },
  tint:   { duration: 120, property: 'background-color' },
  reveal: { duration: 160, property: 'opacity' },
  rotate: { duration: 200, property: 'transform' },
} as const;
