"use client";

import ModalBackdrop from "@/components/ui/ModalBackdrop";
import { useTimingStore } from "@/store/useTimingStore";

import { BuilderShell } from "./BuilderShell";

export default function ConstraintBuilder() {
  const open = useTimingStore((s) => s.builderOpen);
  const initial = useTimingStore((s) => s.builderInitial);
  const signals = useTimingStore((s) => s.signals);
  const closeBuilder = useTimingStore((s) => s.closeBuilder);
  const addConstraint = useTimingStore((s) => s.addConstraint);

  if (!open) return null;

  // The early return above guarantees the shell unmounts whenever the modal
  // closes, so reopening always gets a fresh form. No openSession key needed.
  return (
    <ModalBackdrop onClose={closeBuilder} ariaLabel="Constraint builder">
      <BuilderShell
        signals={signals}
        initial={initial}
        onCancel={closeBuilder}
        onSubmit={(c) => {
          addConstraint(c);
          closeBuilder();
        }}
      />
    </ModalBackdrop>
  );
}
