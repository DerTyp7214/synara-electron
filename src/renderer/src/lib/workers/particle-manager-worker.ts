// noinspection DuplicatedCode

import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import type { ParticleState } from "$lib/types";
import { PARTICLE_SCHEMA } from "$lib/utils/particleClass";
import type { RGBColor } from "colorthief";

let ctx: CanvasRenderingContext2D | null = null;

const state: ParticleState = {
  velocityMultiplier: 1,
  currentVelocityMultiplier: 1,
  emissionRate: 5,
  xOffset: 0,
  yOffset: 0,
  startOffset: 100,
  color: [255, 255, 255],
};

const SMOOTHING_FACTOR = 0.05;
const FRAME_INTERVAL = 1000 / 60;
let lastTime = 0;

const particleBuffers = new Map<number, Float32Array>();

function animate(time: number) {
  requestAnimationFrame(animate);

  const deltaTime = time - lastTime;

  if (deltaTime < FRAME_INTERVAL) {
    return;
  }

  lastTime = time - (deltaTime % FRAME_INTERVAL);

  if (!ctx) return;
  const canvas = ctx.canvas;

  const target = state.velocityMultiplier;
  const current = state.currentVelocityMultiplier;

  state.currentVelocityMultiplier += (target - current) * SMOOTHING_FACTOR;

  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  const [r, g, b] = state.color;

  for (const buffer of particleBuffers.values()) {
    const numParticles = buffer.length / PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;

    for (let i = 0; i < numParticles; i++) {
      const baseIndex = i * PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;

      const x = buffer[baseIndex + PARTICLE_SCHEMA.x];
      const y = buffer[baseIndex + PARTICLE_SCHEMA.y];
      const alpha = buffer[baseIndex + PARTICLE_SCHEMA.alpha];

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5 + 0.5})`;

      ctx.beginPath();
      ctx.arc(x, y, 1 + alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

const logScope = {
  name: "ParticleManagerWorker",
  style: scopeStyle("#44e42b", "#000000"),
};

self.onmessage = (
  event: MessageEvent<{
    type: "init" | "resize" | "addParticles" | "updateColor";
    messagePort: MessagePort;
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    color: RGBColor;
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

      state.color = data.color;

      requestAnimationFrame(animate);

      data.messagePort.onmessage = (
        event: MessageEvent<{ id: number; buffer: Float32Array }>,
      ) => {
        const { id, buffer } = event.data;

        particleBuffers.set(id, buffer);
      };

      scopedDebugLog.bind(self)("info", logScope, data);
      break;

    case "resize":
      if (ctx && ctx.canvas) {
        ctx.canvas.width = data.width;
        ctx.canvas.height = data.height;
      }
      break;

    case "updateColor":
      state.color = data.color;
      break;
  }
};
