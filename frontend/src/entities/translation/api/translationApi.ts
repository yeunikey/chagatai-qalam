import xior from "xior";
import type {
  TranslateRequest,
  TranslateResponse,
  TranslationMeta,
} from "../model/types";

const TRANSLATE_API_BASE =
  process.env.NEXT_PUBLIC_TRANSLATE_API_BASE_URL ?? "/api/translate";

const translationClient = xior.create({
  baseURL: TRANSLATE_API_BASE,
  timeout: 0,
});

function extractError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = error.response.data as { detail?: string } | null;
    return data?.detail;
  }

  return null;
}

export async function getTranslationMeta(): Promise<TranslationMeta> {
  const response = await translationClient.get<TranslationMeta>("/meta");
  return response.data;
}

export async function translateText(
  request: TranslateRequest,
): Promise<TranslateResponse> {
  try {
    const response = await translationClient.post<TranslateResponse>(
      "/translate",
      request,
    );
    return response.data;
  } catch (error) {
    throw new Error(
      extractError(error) ?? "Could not translate with the selected model.",
    );
  }
}
