interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  min?: number;
}

export default function NumberField({ label, value, onChange, suffix, min }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-mono uppercase tracking-widest text-slate-500">{label}</span>
      <div className="flex items-stretch rounded-sm border border-slate-800/80 bg-[#0a0e14] hover:border-slate-700 focus-within:border-slate-500">
        <input
          aria-label={label}
          type="number"
          step="any"
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-[13px] font-mono text-slate-100 focus:outline-none"
        />
        {suffix && (
          <span className="flex items-center px-2 text-[10.5px] font-mono text-slate-500 border-l border-slate-800/80">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
