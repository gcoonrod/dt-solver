interface TypeChipSelectorProps<T> {
  types: T[];
  value: string;
  onChange: (id: string) => void;
  getId: (t: T) => string;
  getLabel: (t: T) => string;
  getIcon?: (t: T) => React.ReactNode;
  getSymbol?: (t: T) => string;
  getBlurb?: (t: T) => string;
  getActiveClass?: (t: T) => string;
  columns?: number;
}

export default function TypeChipSelector<T>({
  types,
  value,
  onChange,
  getId,
  getLabel,
  getIcon,
  getSymbol,
  getBlurb,
  getActiveClass,
  columns,
}: TypeChipSelectorProps<T>) {
  return (
    <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${columns ?? types.length}, 1fr)` }}>
      {types.map((t) => {
        const id = getId(t);
        const active = id === value;
        const activeClass = getActiveClass?.(t) ?? "bg-sky-500/10 border-sky-500/30 text-sky-300 font-medium";
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-sm border text-[11px] leading-none whitespace-nowrap transition ${
              active
                ? `${activeClass} border-current`
                : "bg-[#0a0e14] border-slate-800/80 text-slate-300 hover:text-slate-100 hover:border-slate-700"
            }`}
            title={getBlurb?.(t)}
            aria-label={`${getSymbol?.(t) ?? ""} ${getLabel(t)}`}
          >
            {getIcon?.(t)}
            <span>{getLabel(t)}</span>
            {getSymbol && (
              <span className={`font-mono text-[10px] ${active ? "opacity-70" : "text-slate-500"}`}>
                {getSymbol(t)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
