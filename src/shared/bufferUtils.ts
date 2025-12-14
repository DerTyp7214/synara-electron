import type { TypedArrayBuffer } from "./types/settings";

export function decodeArrayBuffer<K>(buffer: TypedArrayBuffer<K>): K {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(buffer));
}

export function encodeArrayBuffer<K>(data: K): TypedArrayBuffer<K> {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(data)).buffer;
}
