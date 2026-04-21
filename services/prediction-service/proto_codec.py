import struct


def _encode_varint(value: int) -> bytes:
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            break
    return bytes(out)


def _decode_varint(data: bytes, index: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        byte = data[index]
        index += 1
        result |= (byte & 0x7F) << shift
        if (byte & 0x80) == 0:
            return result, index
        shift += 7


def _encode_field_key(field_number: int, wire_type: int) -> bytes:
    return _encode_varint((field_number << 3) | wire_type)


def _encode_string_field(field_number: int, value: str) -> bytes:
    encoded = value.encode("utf-8")
    return _encode_field_key(field_number, 2) + _encode_varint(len(encoded)) + encoded


def _encode_float_field(field_number: int, value: float) -> bytes:
    return _encode_field_key(field_number, 5) + struct.pack("<f", float(value))


def _encode_suggestion(word: str, score: float, source: str) -> bytes:
    payload = bytearray()
    payload.extend(_encode_string_field(1, word))
    payload.extend(_encode_float_field(2, score))
    payload.extend(_encode_string_field(3, source))
    return bytes(payload)


def encode_predict_response(
    input_text: str,
    suggestions: list[tuple[str, float, str]],
    error: str = "",
) -> bytes:
    payload = bytearray()
    payload.extend(_encode_string_field(1, input_text))

    for word, score, source in suggestions:
        suggestion_payload = _encode_suggestion(
            word=word,
            score=score,
            source=source,
        )
        payload.extend(_encode_field_key(2, 2))
        payload.extend(_encode_varint(len(suggestion_payload)))
        payload.extend(suggestion_payload)

    if error:
        payload.extend(_encode_string_field(3, error))

    return bytes(payload)


def _skip_field(data: bytes, index: int, wire_type: int) -> int:
    if wire_type == 0:
        _, index = _decode_varint(data, index)
        return index
    if wire_type == 1:
        return index + 8
    if wire_type == 2:
        length, index = _decode_varint(data, index)
        return index + length
    if wire_type == 5:
        return index + 4
    raise ValueError(f"Unsupported wire type: {wire_type}")


def decode_predict_request(data: bytes) -> tuple[str, int]:
    index = 0
    text = ""
    top_k = 5

    while index < len(data):
        key, index = _decode_varint(data, index)
        field_number = key >> 3
        wire_type = key & 0x07

        if field_number == 1 and wire_type == 2:
            length, index = _decode_varint(data, index)
            text = data[index : index + length].decode("utf-8")
            index += length
        elif field_number == 2 and wire_type == 0:
            top_k, index = _decode_varint(data, index)
        else:
            index = _skip_field(data, index, wire_type)

    return text, top_k
