"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ArrowLeftRight,
  ChevronDown,
  Code2,
  Copy,
  Download,
  FileText,
  FileUp,
  Languages,
  Mic,
  RotateCcw,
  Share2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  Volume2,
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
import { ResetNormalizationButton } from "@/features/reset-normalization";
import { UploadNormalizationFile } from "@/features/upload-normalization-file";

const navButton =
  "inline-flex items-center gap-2 border-0 bg-transparent py-2 text-[0.98rem] font-medium text-[#20242a]";
const modeTab =
  "relative inline-flex min-h-11 flex-none items-center gap-2.5 rounded-md border border-[#e2e4e7] bg-white px-4 text-[0.98rem] font-extrabold text-[#2f3337] shadow-[0_2px_8px_rgba(22,31,41,0.1)]";
const iconButton =
  "relative inline-flex aspect-square h-10 items-center justify-center rounded-lg border-0 bg-transparent text-[#25282c] transition-colors hover:bg-[#f5f6f7] disabled:cursor-not-allowed disabled:opacity-45";
const editorShell =
  "flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#edf0f2] bg-white";
const editorHeader =
  "relative grid min-h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-[#edf0f2]";
const textSurface =
  "flex min-h-[410px] flex-col overflow-hidden border-r border-[#edf0f2] max-[860px]:min-h-[320px] max-[860px]:border-r-0 max-[860px]:border-b";
const textContent =
  "flex-1 resize-none overflow-auto border-0 p-4 text-[1.45rem] leading-[1.55] outline-0 [unicode-bidi:plaintext] whitespace-pre-wrap placeholder:text-[#7d8186] max-[860px]:px-5 max-[860px]:py-6 max-[860px]:text-[1.15rem]";

export function NormalizerPage() {
  const [areSettingsOpen, setAreSettingsOpen] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const {
    source,
    result,
    changes,
    fileName,
    isLoading,
    error,
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

  function showStatus(message: string) {
    setStatusMessage(message);
    window.setTimeout(() => setStatusMessage(""), 2200);
  }

  async function copyText(text: string, message: string) {
    if (!text.trim()) {
      showStatus("Пока нечего копировать");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showStatus(message);
    } catch {
      showStatus("Буфер обмена недоступен");
    }
  }

  async function shareResult() {
    if (!result.trim()) {
      showStatus("Сначала нормализуйте текст");
      return;
    }

    if (navigator.share) {
      await navigator.share({ text: result });
      return;
    }

    await copyText(result, "Результат скопирован");
  }

  function speakResult() {
    if (!result.trim()) {
      showStatus("Сначала нормализуйте текст");
      return;
    }

    if (!("speechSynthesis" in window)) {
      showStatus("Озвучивание недоступно");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result);
    utterance.lang = "ar";
    window.speechSynthesis.speak(utterance);
  }

  function handleFeedback(value: "up" | "down") {
    setFeedback(value);
    showStatus(value === "up" ? "Спасибо за отзыв" : "Отзыв сохранен");
  }

  return (
    <main className="mx-auto flex flex-col gap-6 px-6">
      <header className="flex justify-between py-4 items-center">
        <div className="text-2xl font-extrabold text-[#0f2b46]">
          <span>Chagatai RAMZ</span>
        </div>

        <section
          className="flex items-center gap-2 overflow-x-auto pb-0.5 max-[860px]:my-5"
          aria-label="Режимы работы"
        >
          <button
            className={`${modeTab} border-[#0f5fc2] text-[#0f5fc2] shadow-none`}
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

      <section className="flex items-stretch gap-3 rounded-[22px] max-[1280px]:flex-col">
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
              className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#edf0f2] bg-white text-[#25282c] transition-colors hover:bg-[#f5f6f7] max-[1280px]:right-3"
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
                className={`${textContent} bg-white text-right font-sans text-[#25282c] [direction:rtl]`}
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
                )}
              </div>
              <div className="flex min-h-14 items-center justify-between px-6 pb-3 text-sm text-[#6f747a] max-[860px]:px-4">
                <div className="flex items-center gap-3">
                  <span className="mr-2 rounded-full bg-[#f6f7f8] px-3 py-1.5 text-xs font-extrabold text-[#60666d]">
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

        <NormalizationSettings
          isOpen={areSettingsOpen}
          onToggle={() => setAreSettingsOpen((isOpen) => !isOpen)}
        />
      </section>
    </main>
  );
}
