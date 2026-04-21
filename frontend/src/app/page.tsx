"use client";

import { useState, useCallback, useEffect } from "react";
import { useBookmarks, useEditor } from "@/features/model";
import BookmarksWidget from "@/widgets/BookmarksWidget";
import EditorWidget from "@/widgets/EditorWidget";
import KeyboardWidget from "@/widgets/KeyboardWidget";
import { KeyItem } from "@/entities";
import ModalOverlay from "@/shared/ModalOverlay";
import {
  decodePredictionResponse,
  encodePredictionRequest,
} from "@/shared/predictionProto";

export default function App() {
  const predictionServiceUrl =
    process.env.NEXT_PUBLIC_PREDICTION_SERVICE_URL ?? "/api/prediction";
  const predictionWsUrl =
    process.env.NEXT_PUBLIC_PREDICTION_WS_URL ??
    (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}${predictionServiceUrl.replace(/\/$/, "")}/ws/predict`
      : "");

  const [showBookmarks, setShowBookmarks] = useState(false);
  const { bookmarks, addBookmark, deleteBookmark } = useBookmarks();
  const {
    inputText,
    fontSize,
    textareaRef,
    handleChange,
    insertText,
    adjustFontSize,
    clearText,
    handleBackspace,
  } = useEditor();

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [bookmarkNameInput, setBookmarkNameInput] = useState("");
  const [bookmarkTextToSave, setBookmarkTextToSave] = useState("");

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [predictions, setPredictions] = useState<string[]>([]);
  const [isPredictionsLoading, setIsPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);
  const shouldRequestPredictions =
    inputText.trim().length > 0 && !/\s+$/.test(inputText);

  const handleAddBookmarkClick = useCallback((text: string) => {
    if (!text.trim()) return;
    setBookmarkTextToSave(text);
    setBookmarkNameInput("");
    setIsPromptModalOpen(true);
  }, []);

  const confirmAddBookmark = useCallback(() => {
    if (bookmarkNameInput.trim()) {
      addBookmark(bookmarkTextToSave, bookmarkNameInput);
    }
    setIsPromptModalOpen(false);
  }, [bookmarkNameInput, bookmarkTextToSave, addBookmark]);

  const handleClearTrigger = useCallback(() => {
    setIsConfirmModalOpen(true);
  }, []);

  const confirmClear = useCallback(() => {
    clearText();
    setIsConfirmModalOpen(false);
  }, [clearText]);

  const handleKeyClick = useCallback(
    (key: KeyItem) => insertText(key.value.isolated),
    [insertText],
  );

  const handlePredictionClick = useCallback(
    (prediction: string) => {
      const textToInsert =
        /\s$/.test(inputText) || inputText.length === 0
          ? `${prediction} `
          : ` ${prediction} `;
      insertText(textToInsert);
    },
    [inputText, insertText],
  );

  useEffect(() => {
    if (!shouldRequestPredictions || !predictionWsUrl) {
      return;
    }

    let isActive = true;
    let socket: WebSocket | null = null;
    let gotMessage = false;
    let openTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutId = setTimeout(async () => {
      setIsPredictionsLoading(true);
      setPredictionsError(null);

      try {
        socket = new WebSocket(predictionWsUrl);
        socket.binaryType = "arraybuffer";
        openTimeoutId = setTimeout(() => {
          if (!isActive || !socket) return;
          if (socket.readyState === WebSocket.CONNECTING) {
            setPredictions([]);
            setPredictionsError("WebSocket connection timeout.");
            setIsPredictionsLoading(false);
            socket.close();
          }
        }, 2500);

        socket.onopen = () => {
          if (!isActive || !socket) return;
          const payload = encodePredictionRequest({ text: inputText, topK: 5 });
          const binaryPayload = new Uint8Array(payload.byteLength);
          binaryPayload.set(payload);
          socket.send(binaryPayload.buffer);
        };

        socket.onmessage = async (event) => {
          if (!isActive) return;
          gotMessage = true;
          if (openTimeoutId) {
            clearTimeout(openTimeoutId);
            openTimeoutId = null;
          }
          let bytes: ArrayBuffer;
          if (event.data instanceof ArrayBuffer) {
            bytes = event.data;
          } else if (event.data instanceof Blob) {
            bytes = await event.data.arrayBuffer();
          } else {
            throw new Error("Unexpected websocket message format");
          }

          const payload = decodePredictionResponse(bytes);
          if (payload.error) {
            setPredictions([]);
            setPredictionsError(payload.error);
          } else {
            setPredictions(payload.suggestions.map((item) => item.word));
            setPredictionsError(null);
          }
          setIsPredictionsLoading(false);
          socket?.close();
        };

        socket.onerror = () => {
          if (!isActive) return;
          if (openTimeoutId) {
            clearTimeout(openTimeoutId);
            openTimeoutId = null;
          }
          setPredictions([]);
          setPredictionsError("Prediction service currently unavailable.");
          setIsPredictionsLoading(false);
          socket?.close();
        };

        socket.onclose = () => {
          if (!isActive) return;
          if (openTimeoutId) {
            clearTimeout(openTimeoutId);
            openTimeoutId = null;
          }
          if (!gotMessage) {
            setPredictions([]);
            setPredictionsError("WebSocket closed before response.");
            setIsPredictionsLoading(false);
          }
        };
      } catch {
        if (!isActive) return;
        setPredictions([]);
        setPredictionsError("Prediction service currently unavailable.");
        setIsPredictionsLoading(false);
      }
    }, 300);

    return () => {
      isActive = false;
      if (openTimeoutId) {
        clearTimeout(openTimeoutId);
      }
      socket?.close();
      clearTimeout(timeoutId);
    };
  }, [inputText, predictionWsUrl, shouldRequestPredictions]);

  return (
    <div className="min-h-screen bg-background text-slate-900 font-sans p-4 md:px-12 md:py-0 pb-24!">
      <div
        className={`mx-auto grid grid-cols-1 ${showBookmarks ? "max-w-[95%] lg:grid-cols-4" : "max-w-7xl lg:grid-cols-1"} gap-16 items-start`}
      >
        {showBookmarks && (
          <BookmarksWidget
            bookmarks={bookmarks}
            onInsert={insertText}
            onDelete={deleteBookmark}
            inputText={inputText}
            addBookmark={handleAddBookmarkClick}
          />
        )}

        <main
          className={`order-1 lg:order-2 flex flex-col gap-12 ${showBookmarks ? "lg:col-span-3" : "lg:col-span-1"}`}
        >
          <EditorWidget
            inputText={inputText}
            fontSize={fontSize}
            textareaRef={textareaRef}
            handleChange={handleChange}
            adjustFontSize={adjustFontSize}
            clearText={handleClearTrigger}
            showBookmarks={showBookmarks}
            toggleBookmarks={() => setShowBookmarks((prev) => !prev)}
            addBookmark={addBookmark}
            handleBackspace={handleBackspace}
            insertText={insertText}
            predictions={shouldRequestPredictions ? predictions : []}
            isPredictionsLoading={
              shouldRequestPredictions ? isPredictionsLoading : false
            }
            predictionsError={shouldRequestPredictions ? predictionsError : null}
            onPredictionClick={handlePredictionClick}
          />
          <KeyboardWidget onKeyClick={handleKeyClick} />
        </main>
      </div>

      {isPromptModalOpen && (
        <ModalOverlay>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-xl font-semibold text-slate-800">
              Добавить закладку
            </h3>
            <p className="text-sm text-slate-500">
              Введите название для сохранения текущего текста.
            </p>
            <input
              autoFocus
              type="text"
              value={bookmarkNameInput}
              onChange={(e) => setBookmarkNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAddBookmark();
              }}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-slate-800"
              placeholder="Название закладки..."
            />
            <div className="flex justify-end gap-3 mt-6 pt-2">
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmAddBookmark}
                className="px-5 py-2.5 rounded-xl bg-blue-500 text-white font-medium shadow-sm hover:bg-blue-600 transition-colors"
              >
                Сохранить
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {isConfirmModalOpen && (
        <ModalOverlay>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-xl font-semibold text-slate-800">
              Очистить поле?
            </h3>
            <p className="text-slate-600 text-sm">
              Вы уверены, что хотите полностью очистить поле ввода? Это действие
              нельзя отменить.
            </p>
            <div className="flex justify-end gap-3 mt-6 pt-2">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={confirmClear}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-medium shadow-sm hover:bg-red-600 transition-colors"
              >
                Очистить
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
