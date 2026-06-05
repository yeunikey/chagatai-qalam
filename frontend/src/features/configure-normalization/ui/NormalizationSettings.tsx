"use client";

import {
  ChevronsLeftRight,
  Eraser,
  FileDigit,
  Highlighter,
  LetterText,
  SlidersHorizontal,
  Sparkles,
  TextCursorInput,
  Type,
} from "lucide-react";
import { optionsMeta, useNormalizationStore } from "@/entities/normalization";
import type { NormalizationOptions } from "@/entities/normalization";

const switchInput =
  "relative h-[26px] w-[52px] flex-none appearance-none rounded-full bg-slate-200 transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-5 after:w-5 after:rounded-full after:bg-slate-400 after:shadow-sm after:transition-transform checked:bg-[#dbeafe] checked:after:translate-x-[26px] checked:after:bg-primary";
const optionTool =
  "group relative flex min-h-[44px] items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 text-slate-700 transition-colors hover:bg-slate-100";
const toolLabel =
  "inline-flex min-w-0 flex-1 items-center gap-2.5 text-sm font-medium";
const tooltip =
  "pointer-events-none absolute inset-x-0 top-[calc(100%+6px)] z-30 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold leading-snug text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100";
const showChangesDescription =
  "Подсвечивает измененные фрагменты в нормализованном тексте.";
const optionIcons = {
  remove_tatweel: Eraser,
  normalize_kaf_yay: LetterText,
  remove_diacritics: Sparkles,
  collapse_whitespace: ChevronsLeftRight,
  normalize_persian_digits: FileDigit,
  add_zwnj: TextCursorInput,
  strip_zero_width: Type,
  nfkc: SlidersHorizontal,
} satisfies Record<keyof NormalizationOptions, typeof Eraser>;

type NormalizationSettingsProps = {
  isOpen: boolean;
};

export function NormalizationSettings({
  isOpen,
}: NormalizationSettingsProps) {
  const options = useNormalizationStore((state) => state.options);
  const showChanges = useNormalizationStore((state) => state.showChanges);
  const setOption = useNormalizationStore((state) => state.setOption);
  const setShowChanges = useNormalizationStore((state) => state.setShowChanges);

  return (
    <aside
      className={`relative flex-none overflow-visible transition-[width] duration-300 ease-out ${
        isOpen
          ? "h-[500px] w-[360px] max-[1280px]:h-[500px] max-[1280px]:w-full"
          : "h-[500px] w-0 max-[1280px]:h-0"
      }`}
      aria-hidden={!isOpen}
    >
      <div
        className={`h-full w-[360px] overflow-auto rounded-2xl bg-white p-5 shadow-sm transition-[opacity,transform] duration-300 ease-out max-[1280px]:w-full max-[860px]:px-[18px] ${
          isOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-3 opacity-0"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3 pr-10">
          <h2 className="text-sm font-semibold text-slate-500">Настройки</h2>
        </div>

        <div className="grid gap-2">
          <label className={optionTool}>
            <span className={toolLabel}>
              <Highlighter
                className="flex-none text-slate-500"
                size={16}
                strokeWidth={2.2}
              />
              <span className="min-w-0 truncate">Показывать изменения:</span>
            </span>
            <input
              aria-describedby="show-changes-tooltip"
              className={switchInput}
              checked={showChanges}
              type="checkbox"
              onChange={(event) => setShowChanges(event.target.checked)}
            />
            <span className={tooltip} id="show-changes-tooltip" role="tooltip">
              {showChangesDescription}
            </span>
          </label>
        </div>

        <h2 className="mb-3 mt-7 text-sm font-semibold text-slate-500">
          Правила нормализации
        </h2>

        <div className="grid gap-2">
          {optionsMeta.map((option) => {
            const Icon = optionIcons[option.key];

            return (
              <label className={optionTool} key={option.key}>
                <span className={toolLabel}>
                  <Icon
                    className="flex-none text-slate-500"
                    size={16}
                    strokeWidth={2.2}
                  />
                  <span className="min-w-0 truncate">{option.label}</span>
                </span>
                <input
                  aria-describedby={`${option.key}-tooltip`}
                  className={switchInput}
                  checked={options[option.key]}
                  type="checkbox"
                  onChange={(event) =>
                    setOption(option.key, event.target.checked)
                  }
                />
                <span
                  className={tooltip}
                  id={`${option.key}-tooltip`}
                  role="tooltip"
                >
                  {option.description}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
