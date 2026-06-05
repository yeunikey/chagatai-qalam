import { KeyItem } from "@/entities";
import KeyButton from "@/features/KeyButton";
import { INITIAL_KEYS } from "@/features/model/keys";
import { useMemo } from "react";

const KeyboardWidget = ({
  onKeyClick,
}: {
  onKeyClick: (item: KeyItem) => void;
}) => {
  const letters = useMemo(
    () =>
      INITIAL_KEYS.filter(
        (k) => k.id < 100 && k.id !== 30 && k.id !== 32 && k.id !== 39,
      ),
    [],
  );
  const arabicDigits = useMemo(
    () => INITIAL_KEYS.filter((k) => k.id >= 100 && k.id < 110),
    [],
  );
  const farsiDigits = useMemo(
    () => INITIAL_KEYS.filter((k) => k.id >= 110 && k.id < 120),
    [],
  );
  const diacritics = useMemo(
    () => INITIAL_KEYS.filter((k) => k.id >= 120 && k.id < 130),
    [],
  );

  return (
    <div className="flex-1 flex flex-col space-y-6">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Клавиши</h2>
          <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
            {letters.length}
          </span>
        </div>
        <div
          className="grid gap-3 grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-11"
          dir="rtl"
        >
          {letters.map((key, i) => (
            <KeyButton key={key.id} item={key} index={i} onClick={onKeyClick} />
          ))}
        </div>
      </div>

      <div className="pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Арабские цифры</h2>
          <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
            {arabicDigits.length}
          </span>
        </div>
        <div className="grid gap-3 grid-cols-5 sm:grid-cols-10" dir="rtl">
          {arabicDigits.map((key, i) => (
            <KeyButton key={key.id} item={key} index={i} onClick={onKeyClick} />
          ))}
        </div>
      </div>

      <div className="pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Персидские цифры</h2>
          <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
            {farsiDigits.length}
          </span>
        </div>
        <div className="grid gap-3 grid-cols-5 sm:grid-cols-10" dir="rtl">
          {farsiDigits.map((key, i) => (
            <KeyButton key={key.id} item={key} index={i} onClick={onKeyClick} />
          ))}
        </div>
      </div>

      <div className="pt-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Диакритические знаки</h2>
          <span className="text-xs bg-slate-300 text-slate-700 px-2 py-0.5 rounded-full">
            {diacritics.length}
          </span>
        </div>
        <div className="grid gap-3 grid-cols-5 sm:grid-cols-10" dir="rtl">
          {diacritics.map((key, i) => (
            <KeyButton key={key.id} item={key} index={i} onClick={onKeyClick} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default KeyboardWidget;
