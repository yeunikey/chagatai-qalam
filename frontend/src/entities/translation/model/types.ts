export type TranslateModelId = "translategemma" | "nllb200";

export type TranslationModel = {
  id: TranslateModelId;
  label: string;
  repository: string;
  family: string;
};

export type TranslationLanguage = {
  code: string;
  label: string;
};

export type TranslationMeta = {
  models: TranslationModel[];
  languages: TranslationLanguage[];
  defaults: {
    model: TranslateModelId;
    source_lang: string;
    target_lang: string;
  };
};

export type TranslateRequest = {
  text: string;
  model: TranslateModelId;
  source_lang: string;
  target_lang: string;
};

export type TranslateResponse = {
  text: string;
  model: TranslateModelId;
  source_lang: string;
  target_lang: string;
};
