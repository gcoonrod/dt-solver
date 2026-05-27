interface ColorDotPickerProps {
  value: string;
  onChange: (color: string) => void;
  palette: string[];
  usedColors?: Set<string>;
}

export default function ColorDotPicker({ value, onChange, palette, usedColors }: ColorDotPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      {palette.map((c) => {
        const active = c === value;
        const inUse = usedColors?.has(c) ?? false;
        return (
          <button
            key={c}
            onClick={() => onChange(c)}
            className={`relative w-6 h-6 rounded-sm transition ${active ? "ring-2 ring-offset-1 ring-offset-[#0d1117]" : ""} ${inUse && !active ? "opacity-40" : ""}`}
            style={{
              background: c,
              ...(active ? { "--tw-ring-color": c } as React.CSSProperties : {}),
            }}
            title={c}
            aria-label={`Color ${c}`}
            aria-pressed={active}
          >
            {inUse && !active && (
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 24 24">
                <line x1="4" y1="4" x2="20" y2="20" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
