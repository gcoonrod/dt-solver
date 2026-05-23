import { stateAt } from "@/core/solver";
import type { AnySignal } from "@/types/signal";

/**
 * Resolve a signal's display string at the given instant. Clocks render as
 * "1" / "0"; data signals prefer their explicit `value` (e.g. "0xA9") and
 * fall back to a state-derived glyph ("1", "0", "Z", or the first letter of
 * "VALID" / "INVALID").
 *
 * Lives under `features/` (not `ui/`) because it depends on `@/core/solver` —
 * `ui/` is a store- and core-free tier by spec.
 */
export function formatSignalDisplay(
  signal: AnySignal,
  cursorTimeNs: number,
): string {
  const s = stateAt(signal, cursorTimeNs);
  if (signal.type === "CLOCK") return s.state === "HIGH" ? "1" : "0";
  if (s.value) return s.value;
  if (s.state === "HIGH") return "1";
  if (s.state === "LOW") return "0";
  if (s.state === "HIGH_Z") return "Z";
  return s.state.charAt(0);
}
