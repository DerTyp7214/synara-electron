import { type RGBColor } from "colorthief";
import { scopedDebugLog, scopeStyle } from "$lib/utils/logger";

class Particle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 0;

  constructor(centerX: number, centerY: number, size: number, speed: number) {
    this.maxLife =
      (Math.floor(Math.random() * 240) + 60) * Math.min(1, 6 / speed);

    const halfSize = size / 2;
    const perimeter = size * 4;
    const randomLength = Math.random() * perimeter;

    if (randomLength < size) {
      this.x = centerX - halfSize + randomLength;
      this.y = centerY - halfSize;
    } else if (randomLength < size * 2) {
      this.x = centerX + halfSize;
      this.y = centerY - halfSize + (randomLength - size);
    } else if (randomLength < size * 3) {
      this.x = centerX + halfSize - (randomLength - size * 2);
      this.y = centerY + halfSize;
    } else {
      this.x = centerX - halfSize;
      this.y = centerY + halfSize - (randomLength - size * 3);
    }

    const dx = this.x - centerX;
    const dy = this.y - centerY;

    const radialAngle = Math.atan2(dy, dx);

    const spreadFactor = 0.3;
    const spread = (Math.random() - 0.5) * spreadFactor;

    const angle = radialAngle + spread;
    const baseSpeed = (Math.random() * 1.5 + 0.5) * speed;

    this.vx = Math.cos(angle) * baseSpeed;
    this.vy = Math.sin(angle) * baseSpeed;

    this.x += this.vx;
    this.y += this.vy;
  }

  update(width: number, height: number) {
    this.x += this.vx;
    this.y += this.vy;
    this.life++;
    return (
      this.life < this.maxLife &&
      !(this.x < -5 || this.y < -5 || this.x > width + 5 || this.y > height + 5)
    );
  }
}

let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];

const state = {
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

  if (!ctx) return;
  const canvas = ctx.canvas;

  const target = state.velocityMultiplier;
  const current = state.currentVelocityMultiplier;

  state.currentVelocityMultiplier += (target - current) * SMOOTHING_FACTOR;

  const emissionSpeed = state.currentVelocityMultiplier;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2 + state.xOffset;
  const centerY = height / 2 + state.yOffset;

  ctx.clearRect(0, 0, width, height);
  emitParticles(centerX, centerY, emissionSpeed);

  const [r, g, b] = state.color;

  particles = particles
    .filter((p) => p.update(width, height))
    .toSorted((a, b) => a.life - b.life)
    .slice(0, 1200);

  particles.forEach((p) => {
    if (!ctx) return;
    const alpha = 1 - p.life / p.maxLife;

    //ctx.shadowBlur = alpha * 5;
    //ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5 + 0.5})`;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5 + 0.5})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 1 + alpha, 0, Math.PI * 2);
    ctx.fill();
  });
}

self.onmessage = (
  event: MessageEvent<{
    type: "init" | "resize" | "updateProps" | "updateColor";
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    initialState: typeof state;
    velocityMultiplier: number;
    emissionRate: number;
    startOffset: number;
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
      Object.assign(state, data.initialState);
      state.currentVelocityMultiplier = state.velocityMultiplier;

      requestAnimationFrame(animate);

      scopedDebugLog.bind(self)(
        "info",
        {
          name: "ParticleWorker",
          style: scopeStyle("#44e42b", "#000000"),
        },
        data,
      );
      break;

    case "resize":
      if (ctx && ctx.canvas) {
        ctx.canvas.width = data.width;
        ctx.canvas.height = data.height;

        particles = [];
      }
      break;

    case "updateProps":
      state.velocityMultiplier = data.velocityMultiplier;
      state.emissionRate = data.emissionRate;
      state.startOffset = data.startOffset;
      break;

    case "updateColor":
      state.color = data.color;
      break;
  }
};
