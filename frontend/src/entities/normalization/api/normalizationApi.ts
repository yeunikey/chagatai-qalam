import { apiClient } from "@/shared/api/client";
import type { NormalizeResponse, NormalizationOptions } from "../model/types";

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

export async function normalizeText(
  text: string,
  options: NormalizationOptions,
): Promise<NormalizeResponse> {
  try {
    const response = await apiClient.post<NormalizeResponse>("/api/normalize", {
      text,
      options,
    });

    return response.data;
  } catch (error) {
    throw new Error(extractError(error) ?? "Не удалось выполнить нормализацию");
  }
}

export async function normalizeFile(
  file: File,
  options: NormalizationOptions,
): Promise<NormalizeResponse> {
  const body = new FormData();
  body.append("file", file);
  body.append("options_json", JSON.stringify(options));

  try {
    const response = await apiClient.post<NormalizeResponse>("/api/normalize-file", body);
    return response.data;
  } catch (error) {
    throw new Error(extractError(error) ?? "Не удалось выполнить нормализацию файла");
  }
}
