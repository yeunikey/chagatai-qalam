"use client";

import type { ReactNode } from "react";
import { useNormalizationStore } from "@/entities/normalization";

type DownloadNormalizationResultButtonProps = {
  children: ReactNode;
  className?: string;
};

export function DownloadNormalizationResultButton({
  children,
  className,
}: DownloadNormalizationResultButtonProps) {
  const result = useNormalizationStore((state) => state.result);
  const fileName = useNormalizationStore((state) => state.fileName);

  function downloadResult() {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = fileName.replace(/\.txt$/i, "") || "normalized";
    link.href = url;
    link.download = `${baseName}.normalized.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className={className}
      disabled={!result}
      onClick={downloadResult}
      title="Скачать нормализованный файл"
    >
      {children}
    </button>
  );
}
