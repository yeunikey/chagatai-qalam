import {
  Bookmark,
  Copy,
  DeleteIcon,
  Minus,
  Plus,
  SpaceIcon,
  Trash,
} from "lucide-react";
import Image from "next/image";
import { RefObject } from "react";

const EditorWidget = ({
  inputText,
  fontSize,
  textareaRef,
  handleChange,
  adjustFontSize,
  clearText,
  toggleBookmarks,
  handleBackspace,
  insertText,
  predictions,
  isPredictionsLoading,
  predictionsError,
  onPredictionClick,
}: {
  inputText: string;
  fontSize: number;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  adjustFontSize: (delta: number) => void;
  clearText: () => void;
  showBookmarks: boolean;
  toggleBookmarks: () => void;
  addBookmark: (text: string, name: string) => void;
  handleBackspace: () => void;
  insertText: (text: string) => void;
  predictions: string[];
  isPredictionsLoading: boolean;
  predictionsError: string | null;
  onPredictionClick: (prediction: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="flex items-center gap-4 py-2">
          <Image
            src={"/logo2.png"}
            alt="logo"
            width={5741}
            height={6728}
            className="h-12 w-auto"
          />

          <div className="text-3xl font-semibold text-slate-700 flex items-center gap-2">
            Chagatai Qalam
          </div>
        </div>

        <div className="flex gap-8 items-center h-full">
          <div className="flex items-center gap-1 bg-white px-4 py-2 rounded-2xl shadow-sm">
            <button
              onClick={() => adjustFontSize(-2)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
              title="Уменьшить шрифт"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-semibold w-8 text-center text-slate-600 select-none">
              {fontSize}
            </span>
            <button
              onClick={() => adjustFontSize(2)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
              title="Увеличить шрифт"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex gap-3">
            <div
              onClick={() => navigator.clipboard.writeText(inputText)}
              className="bg-neutral-400 shadow-sm h-16 w-14 rounded-b-2xl flex items-center justify-center cursor-pointer"
            >
              <Copy size={24} className={"stroke-2 stroke-white"} />
            </div>
            <div
              onClick={toggleBookmarks}
              className="bg-primary shadow-sm h-16 w-14 rounded-b-2xl flex items-center justify-center cursor-pointer"
            >
              <Bookmark size={24} className={"fill-white stroke-0"} />
            </div>
            <div
              onClick={clearText}
              className="bg-red-400 shadow-sm h-16 w-14 rounded-b-2xl flex items-center justify-center cursor-pointer"
            >
              <Trash size={24} className={"stroke-2 stroke-white"} />
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleChange}
          style={{ fontSize: `${fontSize}px` }}
          placeholder="Результат ввода"
          className="w-full h-36 lg:h-[200px] p-4 bg-white rounded-2xl shadow-sm focus:ring-0 focus:outline-none resize-none font-medium leading-relaxed text-slate-800"
          dir="rtl"
          inputMode="none"
        />

        <div className="absolute bottom-4 right-3 flex flex-wrap gap-2" dir="rtl">
          {predictions.map((prediction) => (
            <button
              key={prediction}
              type="button"
              onClick={() => onPredictionClick(prediction)}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              {prediction}
            </button>
          ))}
        </div>

        <div
          className="absolute bottom-4 -right-16 bg-slate-500 text-white py-2 px-3 rounded-2xl cursor-pointer hover:bg-slate-600 transition-colors"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBackspace}
        >
          <DeleteIcon size={24} className="inline-block stroke-2" />
        </div>
        <div
          className="absolute bottom-16 -right-16 bg-slate-400 text-white py-2 px-3 rounded-2xl cursor-pointer hover:bg-slate-500 transition-colors"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertText(" ")}
        >
          <SpaceIcon size={24} className="inline-block stroke-2" />
        </div>
      </div>

    </div>
  );
};

export default EditorWidget;
