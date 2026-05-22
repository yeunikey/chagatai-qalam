"use client";

import type { ReactNode } from "react";
import { useNormalizationStore } from "@/entities/normalization";

type ResetNormalizationButtonProps = {
  children: ReactNode;
  className?: string;
};

export function ResetNormalizationButton({ children, className }: ResetNormalizationButtonProps) {
  const reset = useNormalizationStore((state) => state.reset);

  return (
    <button className={className} onClick={reset} title="Очистить">
      {children}
    </button>
  );
}
