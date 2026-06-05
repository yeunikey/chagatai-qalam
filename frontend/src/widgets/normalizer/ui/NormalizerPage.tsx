"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Download,
  FileText,
  Languages,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import {
  HighlightedText,
  useNormalizationStore,
} from "@/entities/normalization";
import { NormalizationSettings } from "@/features/configure-normalization";
import { DownloadNormalizationResultButton } from "@/features/download-normalization-result";
import { NormalizeTextButton } from "@/features/normalize-text";
import { UploadNormalizationFile } from "@/features/upload-normalization-file";

const modeTab =
  "relative inline-flex h-11 flex-none items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50";
const iconButton =
  "relative inline-flex aspect-square h-10 items-center justify-center rounded-xl border-0 bg-transparent text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45";
const editorShell =
  "flex h-[500px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm max-[860px]:h-[500px]";
const editorHeader =
  "relative grid min-h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-slate-100";
const textSurface =
  "flex min-h-0 flex-col overflow-hidden border-r border-slate-100 max-[860px]:min-h-0 max-[860px]:border-r-0 max-[860px]:border-b";
const textContent =
  "flex-1 resize-none overflow-auto border-0 p-4 text-[1.45rem] leading-[1.55] text-slate-800 outline-0 [unicode-bidi:plaintext] whitespace-pre-wrap placeholder:text-slate-400 max-[860px]:px-5 max-[860px]:py-6 max-[860px]:text-[1.15rem]";

export function NormalizerPage() {
  const [areSettingsOpen, setAreSettingsOpen] = useState(true);
  const {
    source,
    result,
    changes,
    showChanges,
    stats,
    setSource,
    options,
    normalize,
  } = useNormalizationStore();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void normalize();
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [source, options, normalize]);

  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex justify-end">
          <section
            className="flex items-center gap-2 overflow-x-auto pb-0.5 max-[860px]:my-5"
            aria-label="Режимы работы"
          >
            <button
              className={`${modeTab} border-[#497ab3] bg-[#eef5ff] text-[#244f7f] shadow-none`}
            >
              <Languages size={22} />
              Нормализовать текст
            </button>
            <UploadNormalizationFile className={`${modeTab} cursor-pointer`}>
              <FileText size={22} />
              Нормализовать файлы
            </UploadNormalizationFile>
          </section>
        </header>

        <section className="flex items-start gap-8 max-[1280px]:flex-col">
          <div className={editorShell}>
            <div className={editorHeader}>
              <div className="flex items-center justify-center text-lg font-semibold">
                Чагатайский
              </div>
              <NormalizeTextButton
                className="flex h-12 w-12 items-center justify-center text-xl font-semibold"
                iconOnly
              >
                <ArrowLeftRight size={23} />
              </NormalizeTextButton>
              <div className="flex items-center justify-center text-lg font-semibold">
                Нормализованный
              </div>

              <button
                aria-label={
                  areSettingsOpen ? "Скрыть настройки" : "Показать настройки"
                }
                className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 max-[1280px]:right-3"
                type="button"
                onClick={() => setAreSettingsOpen((isOpen) => !isOpen)}
              >
                {areSettingsOpen ? (
                  <PanelRightClose size={22} />
                ) : (
                  <PanelRightOpen size={22} />
                )}
              </button>
            </div>

            <div className="grid flex-1 grid-cols-2 max-[860px]:grid-cols-1">
              <div className={textSurface}>
                <textarea
                  aria-label="Исходный текст"
                  className={`${textContent}`}
                  dir="ltr"
                  placeholder="Вставьте текст арабской графикой"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                />
              </div>

              <div className={`${textSurface} border-r-0`}>
                <div
                  className={`${textContent} bg-white text-right font-sans [direction:rtl]`}
                  dir="rtl"
                  aria-live="polite"
                >
                  {showChanges ? (
                    <HighlightedText text={result} changes={changes} />
                  ) : (
                    result || (
                      <span className="text-[#7d8186]">
                        Нормализованный текст появится здесь
                      </span>
                    )
                  )
                  }
                </div>
                <div className="flex min-h-14 items-center justify-between px-6 pb-3 text-sm text-slate-500 max-[860px]:px-4">
                  <div className="flex items-center gap-3">
                    <span className="mr-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
                      {stats.total} изменений
                    </span>

                    <DownloadNormalizationResultButton className={iconButton}>
                      <Download size={22} />
                    </DownloadNormalizationResultButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <NormalizationSettings isOpen={areSettingsOpen} />
        </section>
      </div>
    </main>
  );
}
