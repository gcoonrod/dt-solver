export interface SignalStateBadgeProps {
  color: string;
  display: string;
}

export default function SignalStateBadge({
  color,
  display,
}: SignalStateBadgeProps) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[#0a0e14] border border-slate-800/60">
      <span
        data-testid="signal-state-badge-dot"
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[10px] font-mono text-slate-300">{display}</span>
    </div>
  );
}
