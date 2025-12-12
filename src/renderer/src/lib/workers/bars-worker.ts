// noinspection DuplicatedCode

import { type RGBColor } from "colorthief";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import {
  colorMix,
  rgbToOklch,
  sortedByLightnessOklch,
} from "$lib/color/converters";
import { createCurve } from "$lib/audio/utils";
import { oklchToString, transformColor } from "$lib/color/utils";
import { roundRect } from "$lib/utils/canvasUtils";

let ctx: CanvasRenderingContext2D | null = null;
const state: {
  colors: [RGBColor, RGBColor];
  dataArray: Uint8Array;
} = {
  colors: [
    [255, 255, 255],
    [255, 255, 255],
  ],
  dataArray: new Uint8Array(),
};

const FRAME_INTERVAL = 1000 / 80;
let lastTime = 0;

function animate(time: number) {
  requestAnimationFrame(animate);

  const deltaTime = time - lastTime;

  if (deltaTime < FRAME_INTERVAL) {
    return;
  }

  lastTime = time - (deltaTime % FRAME_INTERVAL);

  if (!ctx) return;

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const PADDING = 20;

  const WIDTH = ctx.canvas.width - PADDING;
  const HEIGHT = ctx.canvas.height;

  if (WIDTH === 0 || HEIGHT === 0) return;

  const [colorA, colorB] = sortedByLightnessOklch(
    rgbToOklch(transformColor(state.colors[0], 300)),
    rgbToOklch(transformColor(state.colors[1], 300)),
  ).map((color) => oklchToString(color));

  ctx.shadowColor = colorA;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const dataArray = createCurve(
    [...state.dataArray].slice(0, -Math.floor(state.dataArray.length / 8)),
    WIDTH / 5 / 2,
  );

  const data = [...dataArray.toReversed(), ...dataArray];

  const multiplier = 0.9;
  const barSpacing = 1;
  const barWidth = WIDTH / data.length - 1;
  const barRadius = 5;

  for (let i = 0; i < data.length; i++) {
    const barHeight = Math.min(
      Math.max(((data[i] * HEIGHT) / 256) * multiplier, 0) + 5,
      HEIGHT,
    );

    const color = colorMix(
      colorA,
      colorB,
      Math.min((barHeight * 1.25) / HEIGHT, 1),
    );
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.min((barHeight * 1.25) / HEIGHT, 1) * 10;
    ctx.fillStyle = color;

    roundRect(
      ctx,
      PADDING / 2 + i * (barWidth + barSpacing),
      HEIGHT / 2 - barHeight / 2,
      Math.max(barWidth, 1),
      barHeight,
      barRadius,
    );
  }
}

self.onmessage = (
  event: MessageEvent<{
    type: "init" | "resize" | "updateProps" | "updateColor" | "update";
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    dataArrayBuffer: ArrayBuffer;
    colors: [RGBColor, RGBColor];
  }>,
) => {
  const data = event.data;

  switch (data.type) {
    case "init":
      if (data.canvas) {
        ctx = data.canvas.getContext("2d");
        ctx!.canvas.width = data.width;
        ctx!.canvas.height = data.height;
      }

      Object.assign(state, {
        colors: data.colors,
        dataArray: new Uint8Array(data.dataArrayBuffer),
      });

      requestAnimationFrame(animate);

      scopedDebugLog.bind(self)(
        "info",
        {
          name: "BarsWorker",
          style: scopeStyle("#44e42b", "#000000"),
        },
        data,
      );
      break;

    case "resize":
      if (ctx && ctx.canvas) {
        ctx.canvas.width = data.width;
        ctx.canvas.height = data.height;
      }
      break;

    case "update":
      state.dataArray = new Uint8Array(data.dataArrayBuffer);
      state.colors = data.colors;
      break;

    case "updateProps":
      state.dataArray = new Uint8Array(data.dataArrayBuffer);
      break;

    case "updateColor":
      state.colors = data.colors;
      break;
  }
};
