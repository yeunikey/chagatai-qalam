"use client";

import type { Change } from "../../model/types";

type HighlightedTextProps = {
  text: string;
  changes: Change[];
};

const reasonLabels: Record<string, string> = {
  zwnj_inserted: "разделитель",
  tatweel_removed: "татвил удален",
  kaf_yay_normalized: "каф/йа",
  persian_digit: "цифра",
  diacritic_removed: "диакритика удалена",
  zero_width_removed: "невидимый символ удален",
  whitespace_collapsed: "пробелы",
  other: "изменение",
};

const changeBase =
  "relative rounded px-1 py-0.5 [box-decoration-break:clone] [-webkit-box-decoration-break:clone] [direction:rtl] [unicode-bidi:isolate] after:absolute after:left-0 after:top-0 after:align-super after:font-sans after:text-[8px] after:font-semibold after:text-[#6f747a] after:[direction:ltr] after:[unicode-bidi:isolate] after:content-[attr(data-label)]";

const changeClasses = {
  replace: `${changeBase} border-b-2 border-[#c99a1b] bg-[#fff1b7]`,
  insert: `${changeBase} border-b-2 border-[#2f9c6b] bg-[#d8f2e5]`,
  delete:
    "relative mx-0.5 rounded border border-dashed border-[#d4584c] bg-[#ffe0dc] px-1 py-0.5 font-sans text-[0.8rem] text-[#9e2d24] [unicode-bidi:isolate] after:ms-1 after:align-super after:font-sans after:text-[0.62rem] after:font-extrabold after:text-[#6f747a] after:[direction:ltr] after:[unicode-bidi:isolate] after:content-[attr(data-label)]",
};

function visibleText(value: string) {
  return value.replace(/\u200c/g, "‌");
}

export function HighlightedText({ text, changes }: HighlightedTextProps) {
  if (!text && changes.length === 0) {
    return <span className="text-[#7d8186]">Нормализованный текст появится здесь</span>;
  }

  const orderedChanges = [...changes].sort((a, b) => a.dst_start - b.dst_start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  orderedChanges.forEach((change, index) => {
    if (change.dst_start > cursor) {
      nodes.push(
        <span key={`plain-${index}`}>{visibleText(text.slice(cursor, change.dst_start))}</span>,
      );
    }

    if (change.type === "delete") {
      nodes.push(
        <span
          className={changeClasses.delete}
          key={`change-${index}`}
          title={`Удалено: ${change.src_text}`}
        >
          ×
        </span>,
      );
      cursor = change.dst_end;
      return;
    }

    nodes.push(
      <span
        className={changeClasses[change.type]}
        key={`change-${index}`}
        title={`${change.src_text || "∅"} → ${change.dst_text || "∅"}`}
      >
        {visibleText(text.slice(change.dst_start, change.dst_end) || change.dst_text)}
      </span>,
    );
    cursor = change.dst_end;
  });

  if (cursor < text.length) {
    nodes.push(<span key="plain-tail">{visibleText(text.slice(cursor))}</span>);
  }

  return <>{nodes}</>;
}
