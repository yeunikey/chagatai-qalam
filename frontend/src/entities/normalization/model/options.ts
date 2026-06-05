import type { NormalizationOptions, OptionMeta } from "./types";

export const defaultOptions: NormalizationOptions = {
  remove_tatweel: false,
  normalize_kaf_yay: true,
  remove_diacritics: false,
  collapse_whitespace: true,
  normalize_persian_digits: true,
  add_zwnj: true,
  strip_zero_width: true,
  nfkc: true,
};

export const optionsMeta: OptionMeta[] = [
  {
    key: "remove_tatweel",
    label: "Удалять татвил",
    description: "Убирает elongation-символ ـ.",
    default: false,
  },
  {
    key: "normalize_kaf_yay",
    label: "Kaf / Yay",
    description: "Приводит варианты ک, ی, ى и похожие символы к канону.",
    default: true,
  },
  {
    key: "remove_diacritics",
    label: "Удалять диакритику",
    description: "Удаляет харакаты и вокализационные знаки.",
    default: false,
  },
  {
    key: "collapse_whitespace",
    label: "Сжимать пробелы",
    description: "Сохраняет строки, но чистит лишние пробелы внутри них.",
    default: true,
  },
  {
    key: "normalize_persian_digits",
    label: "Цифры ۰-۹",
    description: "Переводит персидские цифры в восточно-арабские.",
    default: true,
  },
  {
    key: "add_zwnj",
    label: "Добавлять ZWNJ",
    description: "Предотвращает нежелательное слипание арабских форм.",
    default: true,
  },
  {
    key: "strip_zero_width",
    label: "Удалять невидимые",
    description: "Удаляет ZWJ, LRM, RLM, ALM и BOM.",
    default: true,
  },
  {
    key: "nfkc",
    label: "Unicode NFKC",
    description: "Запускает Unicode-нормализацию перед правилами.",
    default: true,
  },
];

export const sampleText = "کتابـ  ی  بزرگـ\n۱۲۳ کلمه\nبِسْمِ اللهِ الرَّحْمَٰنِ";
