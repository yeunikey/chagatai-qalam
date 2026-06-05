type KeyItem = {
  id: number;
  label: string;
  value: {
    isolated: string;
    final: string;
    medial: string;
    initial: string;
  };
};

type TokenGroup =
  | { type: "keys"; content: KeyItem[] }
  | { type: "text"; content: string[] };

type SavedBookmark = {
  id: string;
  name: string;
  text: string;
};

export type { SavedBookmark, KeyItem, TokenGroup };
