import { KeyItem, TokenGroup, SavedBookmark } from "@/entities";
import { useState, useEffect, useCallback, useRef } from "react";
import { NON_FORWARD_CONNECTORS, CHAR_TO_KEY_MAP } from "./keys";

const DIACRITIC_KEY_IDS = new Set([120, 121, 122, 123, 124]);

const getShape = (
  key: KeyItem,
  type: "isolated" | "final" | "medial" | "initial",
): string => {
  return key.value[type] || key.value.isolated;
};

const isDiacriticKey = (key?: KeyItem): boolean =>
  Boolean(key && DIACRITIC_KEY_IDS.has(key.id));

const getPreviousBaseKey = (
  keyChain: KeyItem[],
  startIndex: number,
): KeyItem | undefined => {
  for (let i = startIndex - 1; i >= 0; i--) {
    const key = keyChain[i];
    if (!isDiacriticKey(key)) return key;
  }
  return undefined;
};

const getNextBaseKey = (
  keyChain: KeyItem[],
  startIndex: number,
): KeyItem | undefined => {
  for (let i = startIndex + 1; i < keyChain.length; i++) {
    const key = keyChain[i];
    if (!isDiacriticKey(key)) return key;
  }
  return undefined;
};

const shapeKeys = (keyChain: KeyItem[]): string[] => {
  return keyChain.map((current, i) => {
    if (isDiacriticKey(current)) {
      return getShape(current, "isolated");
    }

    const prev: KeyItem | undefined = getPreviousBaseKey(keyChain, i);
    const next: KeyItem | undefined = getNextBaseKey(keyChain, i);

    const canPrevConnectForward = prev
      ? !NON_FORWARD_CONNECTORS.has(prev.id)
      : false;
    const canCurrentConnectBackward = current.value.final !== "—";
    const connectToPrev = canPrevConnectForward && canCurrentConnectBackward;

    const canCurrentConnectForward = !NON_FORWARD_CONNECTORS.has(current.id);
    const canNextConnectBackward = next && next.value.final !== "—";
    const connectToNext =
      next && canCurrentConnectForward && canNextConnectBackward;

    if (!connectToPrev && !connectToNext) return getShape(current, "isolated");
    if (connectToPrev && !connectToNext) return getShape(current, "final");
    if (!connectToPrev && connectToNext) return getShape(current, "initial");
    return getShape(current, "medial");
  });
};

const parseTextToTokens = (text: string): (KeyItem | string)[] => {
  const tokens: (KeyItem | string)[] = [];
  const cleanText = text.replace(/ـ/g, "");

  for (const char of cleanText) {
    const key = CHAR_TO_KEY_MAP.get(char);
    if (key) {
      tokens.push(key);
    } else {
      tokens.push(char);
    }
  }
  return tokens;
};

const processTextChange = (newRawText: string, cursorIndexInRaw: number) => {
  try {
    const textBeforeCursor = newRawText.substring(0, cursorIndexInRaw);
    const cleanTextBeforeCursor = textBeforeCursor.replace(/ـ/g, "");
    const logicalIndex = cleanTextBeforeCursor.length;

    const allTokens = parseTextToTokens(newRawText);

    let resultString = "";
    let shapedLengthBeforeCursor = 0;

    const groups: TokenGroup[] = [];
    let currentGroup: (KeyItem | string)[] = [];
    let currentType: "keys" | "text" | null = null;

    const pushGroup = (
      type: "keys" | "text",
      content: (KeyItem | string)[],
    ) => {
      if (type === "keys") {
        groups.push({ type: "keys", content: content as KeyItem[] });
      } else {
        groups.push({ type: "text", content: content as string[] });
      }
    };

    for (const token of allTokens) {
      const isKey = typeof token !== "string";
      const type = isKey ? "keys" : "text";

      if (type !== currentType) {
        if (currentType && currentGroup.length > 0) {
          pushGroup(currentType, currentGroup);
        }
        currentGroup = [token];
        currentType = type;
      } else {
        currentGroup.push(token);
      }
    }
    if (currentType && currentGroup.length > 0) {
      pushGroup(currentType, currentGroup);
    }

    let tokenCounter = 0;

    groups.forEach((group) => {
      if (group.type === "text") {
        const str = group.content.join("");
        resultString += str;
        const len = group.content.length;
        if (tokenCounter < logicalIndex) {
          const remainingNeeded = logicalIndex - tokenCounter;
          if (remainingNeeded >= len) {
            shapedLengthBeforeCursor += str.length;
          } else {
            shapedLengthBeforeCursor += remainingNeeded;
          }
        }
        tokenCounter += len;
      } else {
        const keysInGroup = group.content;
        const forms = shapeKeys(keysInGroup);

        forms.forEach((form) => {
          resultString += form;
          if (tokenCounter < logicalIndex) {
            shapedLengthBeforeCursor += form.length;
          }
          tokenCounter++;
        });
      }
    });

    return { text: resultString, cursor: shapedLengthBeforeCursor };
  } catch {
    return { text: newRawText, cursor: cursorIndexInRaw };
  }
};

const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("arabic_bookmarks");
      if (saved) {
        return JSON.parse(saved) as SavedBookmark[];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem("arabic_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const addBookmark = useCallback((text: string, name: string) => {
    if (!text.trim()) return;
    if (name) {
      setBookmarks((prev) => [
        ...prev,
        { id: Date.now().toString(), name, text },
      ]);
    }
  }, []);

  const deleteBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return { bookmarks, addBookmark, deleteBookmark };
};

const useEditor = () => {
  const [inputText, setInputText] = useState("");
  const [fontSize, setFontSize] = useState(32);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTextChange = useCallback(
    (newRawText: string, newRawCursorIndex: number) => {
      const { text, cursor } = processTextChange(newRawText, newRawCursorIndex);
      setInputText(text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursor, cursor);
        }
      }, 0);
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      applyTextChange(e.target.value, e.target.selectionStart);
    },
    [applyTextChange],
  );

  const insertText = useCallback(
    (textToInsert: string) => {
      if (!textareaRef.current) return;
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newRawText =
        inputText.substring(0, start) + textToInsert + inputText.substring(end);
      const newRawCursorIndex = start + textToInsert.length;
      applyTextChange(newRawText, newRawCursorIndex);
    },
    [inputText, applyTextChange],
  );

  const replaceTextRange = useCallback(
    (start: number, end: number, replacement: string) => {
      const newText =
        inputText.substring(0, start) + replacement + inputText.substring(end);
      const cursor = start + replacement.length;
      setInputText(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cursor, cursor);
        }
      }, 0);
    },
    [inputText],
  );

  const adjustFontSize = useCallback((delta: number) => {
    setFontSize((prev) => Math.max(12, Math.min(120, prev + delta)));
  }, []);

  const clearText = useCallback(() => {
    setInputText("");
  }, []);

  const handleBackspace = useCallback(() => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    if (start === end && start > 0) {
      const newText =
        inputText.substring(0, start - 1) + inputText.substring(end);
      applyTextChange(newText, start - 1);
    } else if (start !== end) {
      const newText = inputText.substring(0, start) + inputText.substring(end);
      applyTextChange(newText, start);
    }
    textareaRef.current.focus();
  }, [inputText, applyTextChange]);

  return {
    inputText,
    fontSize,
    textareaRef,
    handleChange,
    insertText,
    replaceTextRange,
    adjustFontSize,
    clearText,
    handleBackspace,
  };
};

export {
  useEditor,
  useBookmarks,
  processTextChange,
  parseTextToTokens,
  shapeKeys,
  getShape,
};
