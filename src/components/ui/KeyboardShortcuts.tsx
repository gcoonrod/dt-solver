"use client";

import { useEffect, useRef } from "react";

interface KeyboardShortcutsProps {
  onEsc: () => void;
  onSubmit: () => void;
}

export default function KeyboardShortcuts({ onEsc, onSubmit }: KeyboardShortcutsProps) {
  const escRef = useRef(onEsc);
  const submitRef = useRef(onSubmit);
  useEffect(() => { escRef.current = onEsc; }, [onEsc]);
  useEffect(() => { submitRef.current = onSubmit; }, [onSubmit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        escRef.current();
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submitRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
