import type { Settings, TypedArrayBuffer } from "$shared/types/settings";
import { decodeArrayBuffer, encodeArrayBuffer } from "$shared/bufferUtils";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";

const logScope = {
  name: "SettingsWorker",
  style: scopeStyle("#44e42b", "#000000"),
};

self.onmessage = <K extends keyof Settings>(
  event: MessageEvent<{
    type: "encode" | "decode";
    id: number;
    key: K;
    data: Settings[K];
    buffer: TypedArrayBuffer<Settings[K]>;
  }>,
) => {
  const data = event.data;

  switch (data.type) {
    case "encode": {
      try {
        const buffer = encodeArrayBuffer(data.data);
        postMessage(
          {
            id: data.id,
            key: data.key,
            buffer,
          },
          { transfer: [buffer] },
        );
      } catch (e) {
        scopedDebugLog.bind(self)("error", logScope, data, e);
      }
      break;
    }

    case "decode": {
      try {
        postMessage({
          id: data.id,
          key: data.key,
          value: decodeArrayBuffer(data.buffer),
        });
      } catch (e) {
        scopedDebugLog.bind(self)("error", logScope, data, e);
      }
      break;
    }
  }
};
