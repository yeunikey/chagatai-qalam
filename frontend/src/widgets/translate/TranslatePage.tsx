"use client";

import { ArrowLeftRight, Languages, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getTranslationMeta,
  translateText,
  type TranslateModelId,
  type TranslationLanguage,
  type TranslationMeta,
  type TranslationModel,
} from "@/entities/translation";

const fallbackModels: TranslationModel[] = [
  {
    id: "translategemma",
    label: "TranslateGemma Chagatai dLoRA v5",
    repository: "BekaBratan/translategemma-chagatai-dlora_v5",
    family: "Gemma LoRA",
  },
  {
    id: "nllb200",
    label: "NLLB200 SmartInit v5",
    repository: "BekaBratan/nllb200-SmartInit-v5",
    family: "M2M100/NLLB",
  },
];

const fallbackLanguages: TranslationLanguage[] = [
  { code: "uz-Arab", label: "Chagatai / Uzbek Arabic" },
  { code: "ru", label: "Russian" },
  { code: "en", label: "English" },
  { code: "tr", label: "Turkish" },
  { code: "kk", label: "Kazakh" },
  { code: "uz", label: "Uzbek" },
];

const selectClass =
  "h-11 rounded-2xl bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-colors hover:bg-slate-50 focus:ring-2 focus:ring-primary/20";
const panelClass =
  "flex min-h-[440px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm";

export function TranslatePage() {
  const [meta, setMeta] = useState<TranslationMeta | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [model, setModel] = useState<TranslateModelId>("translategemma");
  const [sourceLang, setSourceLang] = useState("uz-Arab");
  const [targetLang, setTargetLang] = useState("ru");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getTranslationMeta()
      .then((response) => {
        if (!isMounted) return;
        setMeta(response);
        setModel(response.defaults.model);
        setSourceLang(response.defaults.source_lang);
        setTargetLang(response.defaults.target_lang);
      })
      .catch(() => {
        if (!isMounted) return;
        setMeta(null);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const models = meta?.models ?? fallbackModels;
  const languages = meta?.languages ?? fallbackLanguages;
  const selectedModel = useMemo(
    () => models.find((item) => item.id === model) ?? models[0],
    [model, models],
  );

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setTranslatedText("");
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await translateText({
        text: sourceText,
        model,
        source_lang: sourceLang,
        target_lang: targetLang,
      });
      setTranslatedText(response.text);
    } catch (caught) {
      setTranslatedText("");
      setError(
        caught instanceof Error ? caught.message : "Translation failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-72px)] bg-background px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={selectClass}
              value={sourceLang}
              onChange={(event) => setSourceLang(event.target.value)}
              aria-label="Source language"
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
            <ArrowLeftRight size={20} className="text-slate-400" />
            <select
              className={selectClass}
              value={targetLang}
              onChange={(event) => setTargetLang(event.target.value)}
              aria-label="Target language"
            >
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          <select
            className={selectClass}
            value={model}
            onChange={(event) =>
              setModel(event.target.value as TranslateModelId)
            }
            aria-label="Translation model"
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </header>

        <section className="flex items-start gap-8 max-[980px]:flex-col">
          <div className={`relative ${panelClass}`}>
            <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Source</h2>
                <p className="text-xs font-medium text-slate-400">
                  {sourceLang}
                </p>
              </div>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isLoading || !sourceText.trim()}
                className="absolute bottom-3 right-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#416fa3] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Languages size={18} />
                )}
                Translate
              </button>
            </div>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              className="min-h-0 flex-1 resize-none border-0 p-5 text-[1.35rem] font-medium leading-[1.55] text-slate-800 outline-0 placeholder:text-slate-400"
              dir={sourceLang.includes("Arab") ? "rtl" : "ltr"}
              placeholder="Enter text to translate"
            />
          </div>

          <div className={panelClass}>
            <div className="flex min-h-16 items-center justify-between border-b border-slate-100 px-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Translation
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  {selectedModel.family} · {targetLang}
                </p>
              </div>
            </div>
            <div
              className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-5 text-[1.35rem] font-medium leading-[1.55] text-slate-800"
              dir={targetLang.includes("Arab") ? "rtl" : "ltr"}
            >
              {error ? (
                <span className="text-base text-[#a23a31]">{error}</span>
              ) : translatedText ? (
                translatedText
              ) : (
                <span className="text-slate-400">
                  Translation will appear here
                </span>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
