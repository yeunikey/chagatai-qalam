export type PredictionRequestPb = {
  text: string;
  topK?: number;
};

export type SuggestionItemPb = {
  word: string;
  score: number;
  source: string;
};

export type PredictionResponsePb = {
  inputText: string;
  suggestions: SuggestionItemPb[];
  error: string;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeVarint = (value: number): Uint8Array => {
  const bytes: number[] = [];
  let cursor = value >>> 0;

  while (cursor >= 0x80) {
    bytes.push((cursor & 0x7f) | 0x80);
    cursor >>>= 7;
  }
  bytes.push(cursor);

  return new Uint8Array(bytes);
};

const concatBytes = (chunks: Uint8Array[]): Uint8Array => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

const encodeFieldKey = (fieldNumber: number, wireType: number): Uint8Array =>
  encodeVarint((fieldNumber << 3) | wireType);

const encodeStringField = (fieldNumber: number, value: string): Uint8Array => {
  const encoded = textEncoder.encode(value);
  return concatBytes([
    encodeFieldKey(fieldNumber, 2),
    encodeVarint(encoded.length),
    encoded,
  ]);
};

const encodeUint32Field = (fieldNumber: number, value: number): Uint8Array =>
  concatBytes([encodeFieldKey(fieldNumber, 0), encodeVarint(value)]);

export const encodePredictionRequest = (input: PredictionRequestPb): Uint8Array => {
  const chunks: Uint8Array[] = [encodeStringField(1, input.text)];
  if (typeof input.topK === "number") {
    chunks.push(encodeUint32Field(2, input.topK));
  }
  return concatBytes(chunks);
};

const readVarint = (
  bytes: Uint8Array,
  startIndex: number,
): { value: number; index: number } => {
  let value = 0;
  let shift = 0;
  let index = startIndex;

  while (index < bytes.length) {
    const byte = bytes[index++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value, index };
    }
    shift += 7;
  }

  throw new Error("Malformed varint");
};

const skipField = (bytes: Uint8Array, index: number, wireType: number): number => {
  if (wireType === 0) {
    return readVarint(bytes, index).index;
  }
  if (wireType === 1) {
    return index + 8;
  }
  if (wireType === 2) {
    const { value: length, index: next } = readVarint(bytes, index);
    return next + length;
  }
  if (wireType === 5) {
    return index + 4;
  }
  throw new Error(`Unsupported wire type: ${wireType}`);
};

const decodeSuggestion = (bytes: Uint8Array): SuggestionItemPb => {
  let index = 0;
  let word = "";
  let score = 0;
  let source = "";

  while (index < bytes.length) {
    const key = readVarint(bytes, index);
    index = key.index;
    const fieldNumber = key.value >> 3;
    const wireType = key.value & 0x07;

    if (fieldNumber === 1 && wireType === 2) {
      const length = readVarint(bytes, index);
      index = length.index;
      word = textDecoder.decode(bytes.subarray(index, index + length.value));
      index += length.value;
      continue;
    }

    if (fieldNumber === 2 && wireType === 5) {
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset + index,
        4,
      );
      score = view.getFloat32(0, true);
      index += 4;
      continue;
    }

    if (fieldNumber === 3 && wireType === 2) {
      const length = readVarint(bytes, index);
      index = length.index;
      source = textDecoder.decode(bytes.subarray(index, index + length.value));
      index += length.value;
      continue;
    }

    index = skipField(bytes, index, wireType);
  }

  return { word, score, source };
};

export const decodePredictionResponse = (
  data: ArrayBuffer | Uint8Array,
): PredictionResponsePb => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let index = 0;
  let inputText = "";
  let error = "";
  const suggestions: SuggestionItemPb[] = [];

  while (index < bytes.length) {
    const key = readVarint(bytes, index);
    index = key.index;
    const fieldNumber = key.value >> 3;
    const wireType = key.value & 0x07;

    if (fieldNumber === 1 && wireType === 2) {
      const length = readVarint(bytes, index);
      index = length.index;
      inputText = textDecoder.decode(bytes.subarray(index, index + length.value));
      index += length.value;
      continue;
    }

    if (fieldNumber === 2 && wireType === 2) {
      const length = readVarint(bytes, index);
      index = length.index;
      const chunk = bytes.subarray(index, index + length.value);
      suggestions.push(decodeSuggestion(chunk));
      index += length.value;
      continue;
    }

    if (fieldNumber === 3 && wireType === 2) {
      const length = readVarint(bytes, index);
      index = length.index;
      error = textDecoder.decode(bytes.subarray(index, index + length.value));
      index += length.value;
      continue;
    }

    index = skipField(bytes, index, wireType);
  }

  return { inputText, suggestions, error };
};
