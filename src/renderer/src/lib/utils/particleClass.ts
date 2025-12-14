export class Particle {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 0;
  alive = true;

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

    this.alive =
      this.life < this.maxLife &&
      !(
        this.x < -5 ||
        this.y < -5 ||
        this.x > width + 5 ||
        this.y > height + 5
      );

    return this.alive;
  }
}

export type MinimalParticleData = {
  x: number;
  y: number;
  alpha: number;
  alive: boolean;
};

export const PARTICLE_SCHEMA = {
  x: 0,
  y: 1,
  alpha: 2,
  alive: 3,
  FLOATS_PER_PARTICLE: 4,
};

export class ParticleDataCoder {
  public static encode(particles: Particle[]): Float32Array {
    const numParticles = particles.length;
    const totalFloats = numParticles * PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;
    const buffer = new Float32Array(totalFloats);

    for (let i = 0; i < numParticles; i++) {
      const particle = particles[i];
      const baseIndex = i * PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;

      buffer[baseIndex + PARTICLE_SCHEMA.x] = particle.x;
      buffer[baseIndex + PARTICLE_SCHEMA.y] = particle.y;
      buffer[baseIndex + PARTICLE_SCHEMA.alpha] =
        1 - particle.life / particle.maxLife;
      buffer[baseIndex + PARTICLE_SCHEMA.alive] = particle.alive ? 1 : 0;
    }
    return buffer;
  }

  public static decode(buffer: Float32Array): MinimalParticleData[] {
    const numParticles = buffer.length / PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;
    const particleData: MinimalParticleData[] = [];

    for (let i = 0; i < numParticles; i++) {
      const baseIndex = i * PARTICLE_SCHEMA.FLOATS_PER_PARTICLE;

      particleData.push({
        x: buffer[baseIndex + PARTICLE_SCHEMA.x],
        y: buffer[baseIndex + PARTICLE_SCHEMA.y],
        alpha: buffer[baseIndex + PARTICLE_SCHEMA.alpha],
        alive: buffer[baseIndex + PARTICLE_SCHEMA.alive] === 1,
      });
    }
    return particleData;
  }
}
