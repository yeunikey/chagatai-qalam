import { KeyItem } from "@/entities";

const KeyButton = ({
  item,
  index,
  onClick,
}: {
  item: KeyItem;
  index: number;
  onClick: (item: KeyItem) => void;
}) => (
  <button
    onClick={() => onClick(item)}
    title={`Вставить: ${item.value.isolated}`}
    className="group relative flex min-w-[36px] flex-1 flex-col items-center justify-center rounded-2xl bg-white p-1 text-center shadow-sm transition-colors hover:bg-slate-50 active:bg-slate-100 md:min-w-0 md:p-2"
  >
    <span className="absolute right-1 top-1 text-[8px] text-slate-300 md:text-[10px]">
      {index + 1}
    </span>
    <span className="my-1 text-2xl font-normal text-slate-900 md:my-2 md:text-3xl">
      {item.value.isolated}
    </span>
    <span className="break-all text-sm font-medium leading-tight text-slate-500">
      {item.label}
    </span>
  </button>
);

export default KeyButton;
