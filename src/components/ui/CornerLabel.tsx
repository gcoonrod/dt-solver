export default function CornerLabel() {
  return (
    <div className="absolute top-1.5 right-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm bg-[#0a0e14]/90 border border-slate-800/60 text-[9.5px] font-mono text-slate-500 uppercase tracking-widest">
      <span
        data-testid="corner-label-dot"
        className="w-1 h-1 rounded-full bg-emerald-400"
      />
      live · 1.0× / div
    </div>
  );
}
