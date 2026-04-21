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
    className="flex-1 group relative flex flex-col items-center justify-center p-1 md:p-2 bg-white hover:bg-blue-50 active:bg-blue-100 border-b-2 md:border-b-4 border-slate-300 active:border-b-0 active:translate-y-0.5 md:active:translate-y-1 rounded md:rounded-lg transition-all duration-100 text-center min-w-[36px] md:min-w-0"
  >
    <span className="absolute top-0.5 right-0.5 md:top-1 md:right-1 text-[8px] md:text-[10px] text-slate-300">
      {index + 1}
    </span>
    <span className="font-normal text-2xl md:text-3xl my-1 md:my-2">
      {item.value.isolated}
    </span>
    <span className="font-medium text-slate-500 break-all leading-tight text-sm">
      {item.label}
    </span>
  </button>
);

export default KeyButton;
