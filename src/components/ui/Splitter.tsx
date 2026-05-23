import type { MouseEvent } from "react";

export interface SplitterProps {
  orientation: "horizontal" | "vertical";
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
}

const HORIZONTAL_CLASSES =
  "h-[5px] w-full cursor-row-resize border-t border-b border-slate-800/80";
const VERTICAL_CLASSES =
  "w-[5px] h-full cursor-col-resize border-l border-r border-slate-800/80";

export default function Splitter({ orientation, onMouseDown }: SplitterProps) {
  const sizing =
    orientation === "horizontal" ? HORIZONTAL_CLASSES : VERTICAL_CLASSES;
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      onMouseDown={onMouseDown}
      className={`${sizing} bg-[#0a0e14] hover:bg-slate-700 flex-shrink-0 relative group`}
    >
      <div
        className={
          orientation === "horizontal"
            ? "absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-700/40 group-hover:bg-slate-500/60"
            : "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-slate-700/40 group-hover:bg-slate-500/60"
        }
      />
    </div>
  );
}
