"use client";

import type { ReactNode } from "react";
import { useNormalizationStore } from "@/entities/normalization";

type NormalizeTextButtonProps = {
  children: ReactNode;
  className?: string;
  iconOnly?: boolean;
};

export function NormalizeTextButton({
  children,
  className,
  iconOnly = false,
}: NormalizeTextButtonProps) {
  const source = useNormalizationStore((state) => state.source);
  const isLoading = useNormalizationStore((state) => state.isLoading);
  const normalize = useNormalizationStore((state) => state.normalize);
  const isDisabled = !iconOnly && (isLoading || source.trim().length === 0);

  return (
    <button
      className={className}
      disabled={isDisabled}
      onClick={normalize}
      title={iconOnly ? "Нормализовать" : undefined}
    >
      {children}
    </button>
  );
}
