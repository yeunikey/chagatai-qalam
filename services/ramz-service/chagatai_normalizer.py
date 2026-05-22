"""
chagatai_normalizer.py
======================
Helper module for Chagatai / Ottoman Arabic-script text normalization.

Designed to be called from a web backend:
    from chagatai_normalizer import normalize, NormalizationOptions

Returns normalized text + a list of Change objects that map every
character-level edit back to both the source and destination strings,
so a frontend can highlight them in a "Google Translate"-style split view.

Dependencies
------------
    pip install regex          # grapheme-cluster support
    (unicodedata is stdlib)

Quick start
-----------
    from chagatai_normalizer import normalize, NormalizationOptions

    result = normalize("کتاب", NormalizationOptions())
    print(result.text)             # normalized string
    for ch in result.changes:
        print(ch)                  # Change(type, src_start, src_end, src_text,
                                   #              dst_start, dst_end, dst_text)
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from typing import List, Optional

import regex  # pip install regex


# ─────────────────────────────────────────────────────────────────────────────
# Public data classes
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class NormalizationOptions:
    """
    Fine-grained control over which normalizations are applied.

    Fields
    ------
    remove_tatweel : bool
        Strip the Arabic tatweel elongation character U+0640 (ـ).
        Default False — many manuscripts use it intentionally.

    normalize_kaf_yay : bool
        Map Persian/Urdu variant letters to their Arabic equivalents:
          ک  ڪ  → ك   (Kaf variants)
          ی  ى  → ي   (Yay / Alef Maqsura variants)
          ە  ھ  ہ  → ه  (Heh variants)
          ۃ      → ة  (Teh Marbuta variant)
        Default True.

    remove_diacritics : bool
        Strip all Arabic vocalization marks (harakat), U+064B–U+065F,
        U+0670, U+06D6–U+06ED.
        Default False.

    collapse_whitespace : bool
        Collapse runs of spaces/tabs into a single space and strip
        leading/trailing whitespace from each line.
        Default True.

    normalize_persian_digits : bool
        Convert Persian-Indic digit forms (۰–۹) to Eastern Arabic forms
        (٠–٩).  Leaves Western digits (0–9) untouched.
        Default True.

    add_zwnj : bool
        Insert a Zero-Width Non-Joiner (U+200C) before characters rendered
        in INITIAL or ISOLATED form when the preceding letter connects left,
        preventing unintended ligature merging.
        Default True.

    strip_zero_width : bool
        Remove invisible formatting characters:
        ZWJ U+200D, LRM U+200E, RLM U+200F, ALM U+061C, BOM U+FEFF.
        ZWNJ (U+200C) is intentionally kept when add_zwnj is True.
        Default True.

    nfkc : bool
        Apply Unicode NFKC normalization (compatibility decomposition
        followed by canonical composition) before all other steps.
        Default True.
    """
    remove_tatweel: bool = False
    normalize_kaf_yay: bool = True
    remove_diacritics: bool = False
    collapse_whitespace: bool = True
    normalize_persian_digits: bool = True
    add_zwnj: bool = True
    strip_zero_width: bool = True
    nfkc: bool = True


@dataclass
class Change:
    """
    Describes a single edit between the raw input and the normalized output.

    type     : "replace" | "delete" | "insert"
    src_*    : character span in the ORIGINAL (input) string
    dst_*    : character span in the NORMALIZED (output) string
    src_text : the original substring (may be "" for inserts)
    dst_text : the replacement/inserted substring (may be "" for deletes)
    reason   : short human-readable tag for the rule that caused the change
    """
    type: str
    src_start: int
    src_end: int
    src_text: str
    dst_start: int
    dst_end: int
    dst_text: str
    reason: str = ""

    def to_dict(self) -> dict:
        return {
            "type": self.type,
            "src_start": self.src_start,
            "src_end": self.src_end,
            "src_text": self.src_text,
            "dst_start": self.dst_start,
            "dst_end": self.dst_end,
            "dst_text": self.dst_text,
            "reason": self.reason,
        }


@dataclass
class NormalizationResult:
    """Return value of `normalize()`."""
    text: str
    changes: List[Change] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "changes": [c.to_dict() for c in self.changes],
        }


# ─────────────────────────────────────────────────────────────────────────────
# Internal constants
# ─────────────────────────────────────────────────────────────────────────────

_ZERO_WIDTH_RE = regex.compile(r"[\u200d\u200e\u200f\u061c\ufeff]")
_DIACRITICS_RE = regex.compile(r"[\u064b-\u065f\u0670\u06d6-\u06ed]")

_PERSIAN_TO_ARABIC_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "٠١٢٣٤٥٦٧٨٩")

# Map from variant form → canonical form (used for output substitution)
_KAF_YAY_MAP: dict[str, str] = {
    "\u06a9": "\u0643",  # ک → ك
    "\u06aa": "\u0643",  # ڪ → ك
    "\u06cc": "\u064a",  # ی → ي
    "\u0649": "\u064a",  # ى → ي   (Alef Maqsura)
    "\u06d5": "\u0647",  # ە → ه
    "\u06be": "\u0647",  # ھ → ه
    "\u06c1": "\u0647",  # ہ → ه
    "\u06c3": "\u0629",  # ۃ → ة
}

# Letters that join to the letter that follows them (left-joiners)
_NON_LEFT_JOINERS = {"DAL", "THAL", "REH", "ZAIN", "JEH", "WAW",
                     "ALEF", "HAMZA", "OE", "U", "YU", "VE", "AE"}


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _connects_to_left(char: str) -> bool:
    """Return True if *char* connects to the following character."""
    mapped = _KAF_YAY_MAP.get(char, char)
    try:
        name = unicodedata.name(mapped)
    except ValueError:
        return False
    parts = name.split()
    if "YEH" in parts or "ALEF MAKSURA" in name:
        return True
    if any(nj in parts for nj in _NON_LEFT_JOINERS):
        return False
    if "TEH" in parts and "MARBUTA" in parts:
        return False
    return "ARABIC" in parts


def _add_zwnj(text: str) -> str:
    """Insert U+200C before INITIAL/ISOLATED forms when the predecessor
    connects left, so they don't accidentally merge into ligatures."""
    result: list[str] = []
    ZWNJ_CHARS = {" ", "\t", "\n", "\r", "\u200c", "\u200d", "\u200e", "\u200f"}
    for i, curr in enumerate(text):
        if i > 0:
            prev = result[-1]
            if prev not in ZWNJ_CHARS:
                try:
                    name_prev = unicodedata.name(prev)
                except ValueError:
                    name_prev = ""
                if "INITIAL FORM" not in name_prev and "MEDIAL FORM" not in name_prev:
                    if _connects_to_left(prev):
                        try:
                            name_curr = unicodedata.name(curr)
                            if "INITIAL FORM" in name_curr or "ISOLATED FORM" in name_curr:
                                result.append("\u200c")
                        except ValueError:
                            pass
        result.append(curr)
    return "".join(result)


def _graphemes(s: str) -> list[str]:
    """Split *s* into Unicode grapheme clusters, then further split on ZWNJ
    so each ZWNJ is its own 'unit' for alignment purposes."""
    raw = regex.findall(r"\X", s)
    out: list[str] = []
    for cluster in raw:
        if "\u200c" in cluster:
            parts = cluster.split("\u200c")
            for i, p in enumerate(parts):
                if p:
                    out.append(p)
                if i < len(parts) - 1:
                    out.append("\u200c")
        else:
            out.append(cluster)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Levenshtein alignment (grapheme level)
# ─────────────────────────────────────────────────────────────────────────────

def _levenshtein_align(src: list[str], dst: list[str]) -> list[tuple]:
    """
    Classic Levenshtein with full traceback.
    Returns a list of (op, src_char, dst_char) where op is one of:
      "equal"   – src_char == dst_char
      "replace" – src_char replaced by dst_char
      "delete"  – src_char deleted (dst_char is "")
      "insert"  – dst_char inserted  (src_char is "")
    """
    n, m = len(src), len(dst)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    back = [[None] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = i
        back[i][0] = "D"
    for j in range(1, m + 1):
        dp[0][j] = j
        back[0][j] = "I"

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if src[i - 1] == dst[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
                back[i][j] = "E"
            else:
                sub = dp[i - 1][j - 1] + 1
                dlt = dp[i - 1][j] + 1
                ins = dp[i][j - 1] + 1
                best = min(sub, dlt, ins)
                dp[i][j] = best
                if best == sub:
                    back[i][j] = "S"
                elif best == dlt:
                    back[i][j] = "D"
                else:
                    back[i][j] = "I"

    i, j = n, m
    ops: list[tuple] = []
    while i > 0 or j > 0:
        op = back[i][j]
        if op == "E":
            ops.append(("equal", src[i - 1], dst[j - 1]))
            i -= 1; j -= 1
        elif op == "S":
            ops.append(("replace", src[i - 1], dst[j - 1]))
            i -= 1; j -= 1
        elif op == "D":
            ops.append(("delete", src[i - 1], ""))
            i -= 1
        elif op == "I":
            ops.append(("insert", "", dst[j - 1]))
            j -= 1
        else:
            break
    ops.reverse()
    return ops


def _ops_to_changes(ops: list[tuple], src_text: str, dst_text: str) -> list[Change]:
    """
    Convert the raw op list from `_levenshtein_align` into `Change` objects
    with real character offsets in both src_text and dst_text.

    Adjacent same-type ops are merged into a single Change for cleaner output.
    """
    changes: list[Change] = []

    src_pos = 0  # cursor in src_text
    dst_pos = 0  # cursor in dst_text

    # We'll group consecutive non-equal ops into a single Change
    pending: Optional[dict] = None  # accumulator

    def flush():
        nonlocal pending
        if pending:
            changes.append(Change(**pending))
            pending = None

    for op, s_ch, d_ch in ops:
        s_len = len(s_ch)
        d_len = len(d_ch)

        if op == "equal":
            flush()
            src_pos += s_len
            dst_pos += d_len
            continue

        # Determine canonical type
        if op == "replace":
            ctype = "replace"
        elif op == "delete":
            ctype = "delete"
        else:  # insert
            ctype = "insert"

        if (pending is not None
                and pending["type"] == ctype
                and pending["src_end"] == src_pos
                and pending["dst_end"] == dst_pos):
            # Extend the current pending change
            pending["src_end"] += s_len
            pending["dst_end"] += d_len
            pending["src_text"] += s_ch
            pending["dst_text"] += d_ch
        else:
            flush()
            pending = {
                "type": ctype,
                "src_start": src_pos,
                "src_end": src_pos + s_len,
                "src_text": s_ch,
                "dst_start": dst_pos,
                "dst_end": dst_pos + d_len,
                "dst_text": d_ch,
                "reason": "",
            }

        src_pos += s_len
        dst_pos += d_len

    flush()
    return changes


# ─────────────────────────────────────────────────────────────────────────────
# Rule tagging  (best-effort: label each change with a rule name)
# ─────────────────────────────────────────────────────────────────────────────

def _tag_reason(change: Change) -> str:
    """Return a short label describing why this change was made."""
    s, d = change.src_text, change.dst_text

    if "\u200c" in d and "\u200c" not in s:
        return "zwnj_inserted"

    if s == "\u0640":
        return "tatweel_removed"

    if all(c in _KAF_YAY_MAP for c in s) and change.type == "replace":
        return "kaf_yay_normalized"

    # Persian digit → Arabic digit
    if change.type == "replace" and s in "۰۱۲۳۴۵۶۷۸۹":
        return "persian_digit"

    if change.type == "delete" and all(
        regex.match(r"[\u064b-\u065f\u0670\u06d6-\u06ed]", c) for c in s
    ):
        return "diacritic_removed"

    if change.type == "delete" and s in "\u200d\u200e\u200f\u061c\ufeff":
        return "zero_width_removed"

    if re.match(r"^\s+$", s) or re.match(r"^\s+$", d):
        return "whitespace_collapsed"

    return "other"


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def normalize(
    text: str,
    options: Optional[NormalizationOptions] = None,
) -> NormalizationResult:
    """
    Normalize a Chagatai / Ottoman Arabic-script string.

    Parameters
    ----------
    text    : raw input string (may contain Persian variants, tatweel, etc.)
    options : NormalizationOptions instance; uses defaults when omitted.

    Returns
    -------
    NormalizationResult
        .text    – the fully normalized string
        .changes – list of Change objects; each has src_* positions in *text*
                   and dst_* positions in the returned .text, plus a .reason tag.
    """
    if options is None:
        options = NormalizationOptions()

    out = text

    # 1. NFKC Unicode normalization
    if options.nfkc:
        out = unicodedata.normalize("NFKC", out)

    # 2. Strip invisible formatting characters (keep ZWNJ U+200C for now)
    if options.strip_zero_width:
        out = _ZERO_WIDTH_RE.sub("", out)

    # 3. Persian digits → Arabic digits
    if options.normalize_persian_digits:
        out = out.translate(_PERSIAN_TO_ARABIC_DIGITS)

    # 4. Remove tatweel
    if options.remove_tatweel:
        out = out.replace("\u0640", "")

    # 5. Remove diacritics (harakat)
    if options.remove_diacritics:
        out = _DIACRITICS_RE.sub("", out)

    # 6. Map variant Kaf / Yay forms to canonical Arabic equivalents
    if options.normalize_kaf_yay:
        out = "".join(_KAF_YAY_MAP.get(ch, ch) for ch in out)

    # 7. Insert ZWNJ before initial/isolated forms that would incorrectly merge
    if options.add_zwnj:
        out = _add_zwnj(out)

    # 8. Collapse whitespace (per line to preserve paragraph structure)
    if options.collapse_whitespace:
        lines_in = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        lines_out = out.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        # Collapse only in the output; alignment will reflect the difference
        lines_out = [re.sub(r"[ \t]+", " ", ln).strip() for ln in lines_out]
        out = "\n".join(lines_out)

    # ── Compute character-level diff (grapheme-aware) ──────────────────────
    src_graphemes = _graphemes(text)
    dst_graphemes = _graphemes(out)
    ops = _levenshtein_align(src_graphemes, dst_graphemes)
    changes = _ops_to_changes(ops, text, out)

    # Tag each change with the rule that caused it
    for ch in changes:
        ch.reason = _tag_reason(ch)

    return NormalizationResult(text=out, changes=changes)


def normalize_lines(
    text: str,
    options: Optional[NormalizationOptions] = None,
) -> NormalizationResult:
    """
    Convenience wrapper: processes each line independently so that
    line-level whitespace collapsing doesn't disturb cross-line offsets.
    The returned Change offsets are relative to the full concatenated
    input/output strings (with newlines).
    """
    if options is None:
        options = NormalizationOptions()

    raw_lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out_lines: list[str] = []
    all_changes: list[Change] = []

    src_cursor = 0
    dst_cursor = 0

    for raw_line in raw_lines:
        result = normalize(raw_line, options)
        norm_line = result.text

        for ch in result.changes:
            all_changes.append(Change(
                type=ch.type,
                src_start=src_cursor + ch.src_start,
                src_end=src_cursor + ch.src_end,
                src_text=ch.src_text,
                dst_start=dst_cursor + ch.dst_start,
                dst_end=dst_cursor + ch.dst_end,
                dst_text=ch.dst_text,
                reason=ch.reason,
            ))

        out_lines.append(norm_line)
        src_cursor += len(raw_line) + 1   # +1 for the newline separator
        dst_cursor += len(norm_line) + 1

    return NormalizationResult(
        text="\n".join(out_lines),
        changes=all_changes,
    )


# ─────────────────────────────────────────────────────────────────────────────
# CLI / quick smoke-test
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    SAMPLE = (
        "کتابـ  ی  بزرگـ\n"          # tatweel, variant ک ی, extra spaces
        "۱۲۳ کلمه\n"                    # Persian digits, variant ک
        "بِسْمِ اللهِ الرَّحْمَٰنِ"    # diacritics
    )

    print("=== Input ===")
    print(SAMPLE)
    print()

    opts = NormalizationOptions(
        remove_tatweel=True,
        normalize_kaf_yay=True,
        remove_diacritics=False,
        collapse_whitespace=True,
        normalize_persian_digits=True,
        add_zwnj=True,
    )

    result = normalize_lines(SAMPLE, opts)

    print("=== Normalized ===")
    print(result.text)
    print()

    print("=== Changes ===")
    print(json.dumps([c.to_dict() for c in result.changes], ensure_ascii=False, indent=2))
