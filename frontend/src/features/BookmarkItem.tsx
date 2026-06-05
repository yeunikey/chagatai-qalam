import { SavedBookmark } from "@/entities";
import { ArrowDownToLine, Copy, Trash2 } from "lucide-react";

const BookmarkItem = ({
  bookmark,
  onInsert,
  onDelete,
}: {
  bookmark: SavedBookmark;
  onInsert: (text: string) => void;
  onDelete: (id: string) => void;
}) => (
  <div className="bg-background p-3 rounded-lg shadow-sm flex flex-col gap-2 transition-all">
    <div className="flex justify-between items-start gap-2">
      <span className="font-semibold text-sm text-slate-800 truncate">
        {bookmark.name}
      </span>
    </div>
    <div
      className="text-right text-lg font-mono text-slate-700 bg-slate-100 p-2 rounded border border-slate-100 break-words"
      dir="rtl"
    >
      {bookmark.text}
    </div>
    <div className="flex justify-end gap-1 mt-1">
      <button
        onClick={() => onInsert(bookmark.text)}
        className="text-xs flex items-center justify-center p-1.5 text-blue-600 hover:bg-blue-50 rounded"
        title="Вставить"
      >
        <ArrowDownToLine size={14} />
      </button>
      <button
        onClick={() => navigator.clipboard.writeText(bookmark.text)}
        className="text-xs flex items-center justify-center p-1.5 text-slate-600 hover:bg-slate-100 rounded"
        title="Копировать"
      >
        <Copy size={14} />
      </button>
      <button
        onClick={() => onDelete(bookmark.id)}
        className="text-xs flex items-center justify-center p-1.5 text-red-500 hover:bg-red-50 rounded"
        title="Удалить"
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

export default BookmarkItem;
