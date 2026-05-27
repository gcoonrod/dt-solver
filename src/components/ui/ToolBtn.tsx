import type { ReactNode } from "react";

export type ToolBtnIcon = "zoom-in" | "zoom-out" | "maximize";

const TOOL_BTN_PATHS: Record<ToolBtnIcon, ReactNode> = {
  "zoom-in": (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
    </g>
  ),
  "zoom-out": (
    <g>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6" />
    </g>
  ),
  maximize: <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />,
};

export interface ToolBtnProps {
  icon: ToolBtnIcon;
  label: string;
  kbd?: string;
  onClick?: () => void;
}

export default function ToolBtn({ icon, label, kbd, onClick }: ToolBtnProps) {
  return (
    <button
      onClick={onClick}
      title={kbd ? `${label} (${kbd})` : label}
      className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-sm"
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {TOOL_BTN_PATHS[icon]}
      </svg>
      <span className="text-[11px]">{label}</span>
    </button>
  );
}
