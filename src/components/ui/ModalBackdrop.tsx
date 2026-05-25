"use client";

interface ModalBackdropProps {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
  ariaLabel: string;
}

export default function ModalBackdrop({ children, onClose, className, ariaLabel }: ModalBackdropProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 z-50 flex items-center justify-center ${className ?? ""}`}
      style={{ background: "rgba(2, 6, 12, 0.66)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}
