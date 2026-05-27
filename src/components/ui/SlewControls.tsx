interface SlewControlsProps {
  riseTimeNs: string;
  setRiseTimeNs: (v: string) => void;
  fallTimeNs: string;
  setFallTimeNs: (v: string) => void;
  linked: boolean;
  setLinked: (v: boolean) => void;
}

export default function SlewControls({ riseTimeNs, setRiseTimeNs, fallTimeNs, setFallTimeNs, linked, setLinked }: SlewControlsProps) {
  const handleRise = (v: string) => {
    setRiseTimeNs(v);
    if (linked) setFallTimeNs(v);
  };
  const handleFall = (v: string) => {
    setFallTimeNs(v);
    if (linked) setRiseTimeNs(v);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">SLEW</span>
      <div className="flex items-stretch gap-1">
        <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] flex-1">
          <span className="flex items-center px-1.5 text-[9px] font-mono text-slate-600">↑</span>
          <input
            aria-label="Rise time"
            type="number" step="any" min={0} value={riseTimeNs}
            onChange={(e) => handleRise(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[12px] font-mono text-slate-100 focus:outline-none"
          />
          <span className="flex items-center px-1 text-[9.5px] font-mono text-slate-600">ns</span>
        </div>
        <button
          onClick={() => setLinked(!linked)}
          className={`flex items-center justify-center w-6 rounded-sm border text-[10px] ${
            linked
              ? "border-sky-500/30 text-sky-400 bg-sky-500/10"
              : "border-slate-800/80 text-slate-600 bg-[#0a0e14]"
          }`}
          title={linked ? "Unlink rise/fall" : "Link rise/fall"}
          aria-label={linked ? "Unlink slew" : "Link slew"}
        >
          {linked ? "⇄" : "≠"}
        </button>
        <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] flex-1">
          <span className="flex items-center px-1.5 text-[9px] font-mono text-slate-600">↓</span>
          <input
            aria-label="Fall time"
            type="number" step="any" min={0} value={fallTimeNs}
            onChange={(e) => handleFall(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[12px] font-mono text-slate-100 focus:outline-none"
          />
          <span className="flex items-center px-1 text-[9.5px] font-mono text-slate-600">ns</span>
        </div>
      </div>
    </div>
  );
}
