import { SavedBookmark } from "@/entities";
import BookmarkItem from "@/features/BookmarkItem";

const BookmarksWidget = ({
  bookmarks,
  onInsert,
  onDelete,
  inputText,
  addBookmark,
}: {
  bookmarks: SavedBookmark[];
  onInsert: (text: string) => void;
  onDelete: (id: string) => void;
  inputText: string;
  addBookmark: (text: string) => void;
}) => (
  <aside className="order-2 lg:order-1 lg:col-span-1 flex flex-col h-[300px] lg:h-[calc(100vh-3rem)] lg:sticky lg:top-6 space-y-3">
    <div className="bg-white shadow-sm p-4 rounded-2xl flex-1 flex flex-col min-h-0">
      <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2 shrink-0">
        Закладки
      </h2>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {bookmarks.length === 0 ? (
          <p className="text-sm text-slate-500 italic">Нет закладок</p>
        ) : (
          bookmarks.map((b) => (
            <BookmarkItem
              key={b.id}
              bookmark={b}
              onInsert={onInsert}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <div
        className="w-full py-2 bg-primary rounded-2xl text-white text-center cursor-pointer"
        onClick={() => addBookmark(inputText)}
      >
        Добавить закладку
      </div>
    </div>
  </aside>
);

export default BookmarksWidget;
