import { create } from "zustand";
import { normalizeFile, normalizeText } from "../api/normalizationApi";
import { defaultOptions, sampleText } from "./options";
import type { Change, NormalizationOptions } from "./types";

type NormalizationStats = {
  total: number;
  replace: number;
  insert: number;
  remove: number;
};

type NormalizationState = {
  source: string;
  result: string;
  changes: Change[];
  options: NormalizationOptions;
  fileName: string;
  isLoading: boolean;
  error: string;
  showChanges: boolean;
  stats: NormalizationStats;
  setSource: (source: string) => void;
  setShowChanges: (showChanges: boolean) => void;
  setOption: <TKey extends keyof NormalizationOptions>(
    key: TKey,
    value: NormalizationOptions[TKey],
  ) => void;
  normalize: () => Promise<void>;
  normalizeUploadedFile: (file: File) => Promise<void>;
  reset: () => void;
};

function getStats(changes: Change[]): NormalizationStats {
  return {
    total: changes.length,
    replace: changes.filter((change) => change.type === "replace").length,
    insert: changes.filter((change) => change.type === "insert").length,
    remove: changes.filter((change) => change.type === "delete").length,
  };
}

let normalizationRequestId = 0;

function invalidateNormalizationRequest() {
  normalizationRequestId += 1;
}

export const useNormalizationStore = create<NormalizationState>((set, get) => ({
  source: sampleText,
  result: "",
  changes: [],
  options: defaultOptions,
  fileName: "",
  isLoading: false,
  error: "",
  showChanges: true,
  stats: getStats([]),
  setSource: (source) => {
    invalidateNormalizationRequest();
    set({ source });
  },
  setShowChanges: (showChanges) => set({ showChanges }),
  setOption: (key, value) => {
    invalidateNormalizationRequest();
    set((state) => ({
      options: {
        ...state.options,
        [key]: value,
      },
    }));
  },
  normalize: async () => {
    const { source, options } = get();
    const requestId = ++normalizationRequestId;

    if (source.trim().length === 0) {
      set({
        result: "",
        changes: [],
        error: "",
        isLoading: false,
        stats: getStats([]),
      });
      return;
    }

    set({ isLoading: true, error: "" });

    try {
      const response = await normalizeText(source, options);
      if (requestId !== normalizationRequestId) return;

      set({
        result: response.text,
        changes: response.changes,
        stats: getStats(response.changes),
      });
    } catch (caught) {
      if (requestId !== normalizationRequestId) return;

      set({ error: caught instanceof Error ? caught.message : "Ошибка нормализации" });
    } finally {
      if (requestId !== normalizationRequestId) return;

      set({ isLoading: false });
    }
  },
  normalizeUploadedFile: async (file) => {
    const { options } = get();
    const requestId = ++normalizationRequestId;
    set({ fileName: file.name, isLoading: true, error: "" });

    try {
      const text = await file.text();
      const response = await normalizeFile(file, options);
      if (requestId !== normalizationRequestId) return;

      set({
        source: text,
        result: response.text,
        changes: response.changes,
        stats: getStats(response.changes),
      });
    } catch (caught) {
      if (requestId !== normalizationRequestId) return;

      set({ error: caught instanceof Error ? caught.message : "Не удалось прочитать файл" });
    } finally {
      if (requestId !== normalizationRequestId) return;

      set({ isLoading: false });
    }
  },
  reset: () => {
    invalidateNormalizationRequest();
    set({
      source: "",
      result: "",
      changes: [],
      fileName: "",
      error: "",
      stats: getStats([]),
      isLoading: false,
    });
  },
}));
