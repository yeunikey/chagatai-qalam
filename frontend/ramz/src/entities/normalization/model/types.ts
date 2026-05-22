export type NormalizationOptions = {
  remove_tatweel: boolean;
  normalize_kaf_yay: boolean;
  remove_diacritics: boolean;
  collapse_whitespace: boolean;
  normalize_persian_digits: boolean;
  add_zwnj: boolean;
  strip_zero_width: boolean;
  nfkc: boolean;
};

export type ChangeType = "replace" | "delete" | "insert";

export type Change = {
  type: ChangeType;
  src_start: number;
  src_end: number;
  src_text: string;
  dst_start: number;
  dst_end: number;
  dst_text: string;
  reason: string;
};

export type NormalizeResponse = {
  text: string;
  changes: Change[];
};

export type OptionMeta = {
  key: keyof NormalizationOptions;
  label: string;
  description: string;
  default: boolean;
};
