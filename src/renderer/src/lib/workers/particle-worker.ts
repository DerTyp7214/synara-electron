// noinspection DuplicatedCode

import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";
import type { ParticleState } from "$lib/types";
import { Particle, ParticleDataCoder } from "$lib/utils/particleClass";

let particles: Particle[] = [];

const SMOOTHING_FACTOR = 0.05;
const FRAME_INTERVAL = 1000 / 60;
let lastTime = 0;

function emitParticles(
  centerX: number,
  centerY: number,
  emissionSpeed: number,
) {
  const count = Math.ceil(state.emissionRate);
  for (let i = 0; i < count; i++) {
    particles.push(
      new Particle(centerX, centerY, state.startOffset, emissionSpeed),
    );
  }
}

function animate(time: number) {
  requestAnimationFrame(animate);

  const deltaTime = time - lastTime;

  if (deltaTime < FRAME_INTERVAL) {
    return;
  }

  lastTime = time - (deltaTime % FRAME_INTERVAL);

  const target = state.velocityMultiplier;
  const current = state.currentVelocityMultiplier;

  state.currentVelocityMultiplier += (target - current) * SMOOTHING_FACTOR;

  const emissionSpeed = state.currentVelocityMultiplier;

  const centerX = state.width / 2 + state.xOffset;
  const centerY = state.height / 2 + state.yOffset;

  emitParticles(centerX, centerY, emissionSpeed);

  particles = particles.filter((p) => p.update(state.width, state.height));

  sendParticles();
}

function sendParticles() {
  const floatArray = ParticleDataCoder.encode(particles);
  state.messagePort?.postMessage({ id: state.id, buffer: floatArray }, [
    floatArray.buffer,
  ]);
}

const state: ParticleState & {
  id: number;
  width: number;
  height: number;
  messagePort?: MessagePort;
} = {
  id: 0,
  velocityMultiplier: 1,
  currentVelocityMultiplier: 1,
  emissionRate: 5,
  xOffset: 0,
  yOffset: 0,
  width: 0,
  height: 0,
  startOffset: 100,
  color: [255, 255, 255],
};

let logScope = {
  name: `ParticleWorker`,
  style: scopeStyle("#44e42b", "#000000"),
};

self.onmessage = (
  event: MessageEvent<{
    type: "init" | "resize" | "updateProps" | "updateEmissionRate";
    id: number;
    width: number;
    height: number;
    messagePort: MessagePort;
    initialState: ParticleState;
    velocityMultiplier: number;
    emissionRate: number;
    startOffset: number;
  }>,
) => {
  const data = event.data;

  switch (data.type) {
    case "init":
      state.id = data.id;
      state.width = data.width;
      state.height = data.height;
      state.messagePort = data.messagePort;

      logScope = {
        name: `ParticleWorker-${data.id}`,
        style: scopeStyle("#44e42b", "#000000"),
      };

      Object.assign(state, data.initialState);

      requestAnimationFrame(animate);

      scopedDebugLog.bind(self)("info", logScope, data);
      break;

    case "resize":
      state.width = data.width;
      state.height = data.height;

      particles = [];

      sendParticles();
      break;

    case "updateProps":
      state.velocityMultiplier = data.velocityMultiplier;
      state.startOffset = data.startOffset;
      break;

    case "updateEmissionRate":
      state.emissionRate = data.emissionRate;
      break;
  }
};
