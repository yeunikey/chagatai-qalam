"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useNormalizationStore } from "@/entities/normalization";

type UploadNormalizationFileProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

export function UploadNormalizationFile({
  children,
  className,
  title = "Загрузить .txt файл",
}: UploadNormalizationFileProps) {
  const normalizeUploadedFile = useNormalizationStore((state) => state.normalizeUploadedFile);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    await normalizeUploadedFile(file);
    event.target.value = "";
  }

  return (
    <label className={className} title={title}>
      {children}
      <input
        className="absolute inset-0 opacity-0"
        accept=".txt,text/plain"
        type="file"
        onChange={handleFile}
      />
    </label>
  );
}
