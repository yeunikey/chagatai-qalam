import {
  Bookmark,
  Copy,
  DeleteIcon,
  Minus,
  Plus,
  SpaceIcon,
  Trash,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { RefObject, ReactNode } from "react";

const wordBoundaryPattern =
  /[\s.,!?;:()[\]{}"'«»،؛؟\u060c\u061b\u061f\n\r\t]/u;

type VariantOption = {
  label: string;
  title: string;
  value: string;
};

type FinalVariantConfig = {
  id: string;
  singleChars: Set<string>;
  options: (currentValue: string) => VariantOption[];
};

type FinalVariantRange = {
  start: number;
  end: number;
  config: FinalVariantConfig;
};

const finalVariantConfigs: FinalVariantConfig[] = [
  {
    id: "kaf",
    singleChars: new Set(["ك", "ﻚ", "ک", "ﮏ"]),
    options: (currentValue) => {
      const isIsolated = currentValue === "ك" || currentValue === "ک";

      return [
        {
          label: "ك",
          title: "кәф",
          value: isIsolated ? "ك" : "ﻚ",
        },
        {
          label: "ک",
          title: "коф",
          value: isIsolated ? "ک" : "ﮏ",
        },
      ];
    },
  },
  {
    id: "ng",
    singleChars: new Set(["ڭ", "ﯔ", "ݣ"]),
    options: (currentValue) => {
      const isIsolated = currentValue === "ڭ" || currentValue === "ݣ";

      return [
        {
          label: "ڭ",
          title: "кәф",
          value: isIsolated ? "ڭ" : "ﯔ",
        },
        {
          label: "ݣ",
          title: "ң",
          value: isIsolated ? "ݣ" : "ـݣ",
        },
      ];
    },
  },
];

const isFinalRange = (text: string, end: number) => {
  const nextChar = text[end];

  if (!nextChar) return true;
  return wordBoundaryPattern.test(nextChar);
};

const findFinalVariantAt = (
  text: string,
  index: number,
): FinalVariantRange | null => {
  const ngConfig = finalVariantConfigs.find((config) => config.id === "ng");

  if (ngConfig && text.startsWith("ـݣ", index)) {
    const end = index + 2;
    return isFinalRange(text, end)
      ? { start: index, end, config: ngConfig }
      : null;
  }

  if (text[index - 1] === "ـ" && text[index] === "ݣ") {
    return null;
  }

  const config = finalVariantConfigs.find((item) =>
    item.singleChars.has(text[index]),
  );
  const end = index + 1;

  if (!config || !isFinalRange(text, end)) return null;
  return { start: index, end, config };
};

const getFinalVariantRanges = (text: string) => {
  const ranges: FinalVariantRange[] = [];

  for (let index = 0; index < text.length; index++) {
    const range = findFinalVariantAt(text, index);
    if (range) {
      ranges.push(range);
      index = range.end - 1;
    }
  }

  return ranges;
};

const buildHighlightedNodes = (
  text: string,
  ranges: FinalVariantRange[],
  onChoose: (start: number, end: number, value: string) => void,
) => {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      nodes.push(
        <span key={`plain-${index}`}>{text.slice(cursor, range.start)}</span>,
      );
    }

    const value = text.slice(range.start, range.end);
    nodes.push(
      <span
        className="group pointer-events-auto relative inline-block rounded border-b-2 border-primary bg-[#dcecff] px-0.5 text-slate-900 [box-decoration-break:clone] [-webkit-box-decoration-break:clone]"
        key={`${range.config.id}-${range.start}`}
      >
        {value}
        <span className="invisible absolute bottom-full left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-xl bg-white p-1 text-xl shadow-lg ring-1 ring-slate-200 group-hover:visible">
          {range.config.options(value).map((option) => (
            <button
              type="button"
              className="min-h-9 min-w-9 rounded-lg px-2 text-slate-800 transition-colors hover:bg-slate-100"
              key={option.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChoose(range.start, range.end, option.value)}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </span>
      </span>,
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    nodes.push(<span key="plain-tail">{text.slice(cursor)}</span>);
  }

  return nodes;
};

const EditorWidget = ({
  inputText,
  fontSize,
  textareaRef,
  handleChange,
  adjustFontSize,
  clearText,
  toggleBookmarks,
  handleBackspace,
  insertText,
  replaceTextRange,
  predictions,
  isPredictionsLoading,
  predictionsError,
  onPredictionClick,
}: {
  inputText: string;
  fontSize: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  adjustFontSize: (delta: number) => void;
  clearText: () => void;
  showBookmarks: boolean;
  toggleBookmarks: () => void;
  addBookmark: (text: string, name: string) => void;
  handleBackspace: () => void;
  insertText: (text: string) => void;
  replaceTextRange: (start: number, end: number, replacement: string) => void;
  predictions: string[];
  isPredictionsLoading: boolean;
  predictionsError: string | null;
  onPredictionClick: (prediction: string) => void;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const finalVariantRanges = useMemo<FinalVariantRange[]>(
    () => getFinalVariantRanges(inputText),
    [inputText],
  );
  const hasFinalVariants = finalVariantRanges.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-11 items-center gap-1 rounded-2xl bg-white px-3 shadow-sm">
            <button
              onClick={() => adjustFontSize(-2)}
              className="rounded-xl p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Уменьшить шрифт"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-semibold w-8 text-center text-slate-600 select-none">
              {fontSize}
            </span>
            <button
              onClick={() => adjustFontSize(2)}
              className="rounded-xl p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
              title="Увеличить шрифт"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(inputText)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              title="Копировать"
            >
              <Copy size={21} />
            </button>
            <button
              type="button"
              onClick={toggleBookmarks}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-primary shadow-sm transition-colors hover:bg-slate-50"
              title="Закладки"
            >
              <Bookmark size={21} className="fill-primary stroke-0" />
            </button>
            <button
              type="button"
              onClick={clearText}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#d4584c] shadow-sm transition-colors hover:bg-[#fff4f2]"
              title="Очистить"
            >
              <Trash size={21} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative w-full rounded-2xl bg-white shadow-sm">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleChange}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          style={{ fontSize: `${fontSize}px` }}
          placeholder="Результат ввода"
          className={`block h-36 w-full resize-none rounded-2xl bg-transparent p-4 font-medium leading-relaxed caret-slate-800 focus:outline-none focus:ring-0 lg:h-[200px] ${
            hasFinalVariants ? "text-transparent" : "text-slate-800"
          }`}
          dir="rtl"
          inputMode="none"
        />

        {hasFinalVariants && (
          <div
            className="pointer-events-none absolute inset-0 overflow-visible rounded-2xl p-4 font-medium leading-relaxed text-slate-800"
            dir="rtl"
            style={{ fontSize: `${fontSize}px` }}
          >
            <div
              className="whitespace-pre-wrap break-words"
              style={{ transform: `translateY(-${scrollTop}px)` }}
            >
              {buildHighlightedNodes(
                inputText,
                finalVariantRanges,
                (start, end, value) => replaceTextRange(start, end, value),
              )}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-3 flex flex-wrap gap-2" dir="rtl">
          {isPredictionsLoading && (
            <span className="rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-500 shadow-sm">
              Подбираю...
            </span>
          )}
          {predictionsError && (
            <span className="rounded-lg bg-[#fff4f2] px-3 py-1.5 text-sm font-medium text-[#a23a31] shadow-sm">
              {predictionsError}
            </span>
          )}
          {predictions.map((prediction) => (
            <button
              key={prediction}
              type="button"
              onClick={() => onPredictionClick(prediction)}
              className="rounded-2xl bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              {prediction}
            </button>
          ))}
        </div>

        <div
          className="absolute bottom-4 -right-16 cursor-pointer rounded-2xl bg-white px-3 py-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 max-lg:bottom-20 max-lg:right-3"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBackspace}
        >
          <DeleteIcon size={24} className="inline-block stroke-2" />
        </div>
        <div
          className="absolute bottom-16 -right-16 cursor-pointer rounded-2xl bg-white px-3 py-2 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 max-lg:bottom-20 max-lg:right-16"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertText(" ")}
        >
          <SpaceIcon size={24} className="inline-block stroke-2" />
        </div>
      </div>
    </div>
  );
};

export default EditorWidget;
