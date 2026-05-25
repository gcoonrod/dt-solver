"use client";

import ColorDotPicker from "@/components/ui/ColorDotPicker";
import FormSection from "@/components/ui/FormSection";
import type { AnySignal } from "@/types/signal";

import { COLOR_PALETTE } from "./constants";

// ============================================================================
// Appearance row
// ============================================================================

interface SBAppearanceRowProps {
  color: string; setColor: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  signals: AnySignal[];
}

export default function SBAppearanceRow({ color, setColor, description, setDescription, signals }: SBAppearanceRowProps) {
  const usedColors = new Set(signals.map((s) => s.color).filter((c): c is string => c != null));
  return (
    <FormSection label="Appearance" kbd="color · description">
      <div className="grid grid-cols-[auto_1fr] gap-3 items-stretch">
        <ColorDotPicker
          value={color}
          onChange={setColor}
          palette={COLOR_PALETTE}
          usedColors={usedColors}
        />
        <input
          aria-label="Signal description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Signal description..."
          className="w-full px-3 py-2 rounded-sm bg-[#0a0e14] border border-slate-800/80 hover:border-slate-700 focus:border-slate-500 focus:outline-none text-[12px] font-mono text-slate-100 placeholder-slate-600 transition"
        />
      </div>
    </FormSection>
  );
}
