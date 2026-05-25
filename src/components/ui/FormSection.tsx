interface FormSectionProps {
  label: string;
  kbd?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function FormSection({ label, kbd, action, children }: FormSectionProps) {
  return (
    <section className="px-5 pt-4 pb-4 border-b border-slate-800/60">
      <div className="flex items-center justify-between mb-2.5 whitespace-nowrap">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">
            {label}
          </span>
          {kbd && (
            <span className="text-[9.5px] font-mono text-slate-600 tracking-tight truncate">
              {kbd}
            </span>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
