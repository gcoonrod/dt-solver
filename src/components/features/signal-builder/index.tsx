"use client";

import { useEffect, useRef, useState } from "react";

import ModalBackdrop from "@/components/ui/ModalBackdrop";
import { useTimingStore } from "@/store/useTimingStore";

import BuilderShell from "./BuilderShell";

export default function SignalBuilder() {
  const open = useTimingStore((s) => s.signalBuilderOpen);
  const initial = useTimingStore((s) => s.signalBuilderInitial);
  const closeSignalBuilder = useTimingStore((s) => s.closeSignalBuilder);
  const [openSession, setOpenSession] = useState(0);
  const prevInitialRef = useRef(initial);

  useEffect(() => {
    if (open && initial !== prevInitialRef.current) {
      setOpenSession((n) => n + 1);
    }
    prevInitialRef.current = initial;
  }, [open, initial]);

  if (!open) return null;

  return (
    <ModalBackdrop onClose={closeSignalBuilder} ariaLabel="Signal builder">
      <BuilderShell key={openSession} initial={initial} onClose={closeSignalBuilder} />
    </ModalBackdrop>
  );
}
