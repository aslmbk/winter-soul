import * as THREE from "three";
import * as MATH from "./Math";

const DRAG = 0.5;

// ParticleSystem will contain a bunch of emitters
class ParticleSystem {
  emitters: Emitter[] = [];

  constructor() {}

  dispose() {
    for (let i = 0; i < this.emitters.length; ++i) this.emitters[i].dispose();
  }

  get StillActive() {
    for (let i = 0; i < this.emitters.length; ++i) {
      if (this.emitters[i].StillActive) return true;
    }
    return false;
  }

  addEmitter(emitter: Emitter) {
    this.emitters.push(emitter);
  }

  step(timeElapsed: number, totalTimeElapsed: number) {
    for (let i = 0; i < this.emitters.length; ++i) {
      const e = this.emitters[i];
      e.step(timeElapsed, totalTimeElapsed);
      if (!e.StillActive) e.dispose();
    }
    this.emitters = this.emitters.filter((e) => e.StillActive);
  }
}

class ParticleRendererParams {
  maxParticles = 100;
  group = new THREE.Group();

  constructor() {}
}

// ParticleRenderer will render particles
class ParticleRenderer {
  particleGeometry: THREE.BufferGeometry | null = null;
  particlePoints: THREE.Points | null = null;
  material: THREE.ShaderMaterial | null = null;

  constructor() {}

  dispose() {
    this.particlePoints?.removeFromParent();
    this.particleGeometry?.dispose();
    this.material?.dispose();

    this.particlePoints = null;
    this.particleGeometry = null;
    this.material = null;
  }

  initialize(material: THREE.ShaderMaterial, params: ParticleRendererParams) {
    this.particleGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(params.maxParticles * 3);
    const particleData = new Float32Array(params.maxParticles * 2);

    this.particleGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.particleGeometry.setAttribute(
      "particleData",
      new THREE.Float32BufferAttribute(particleData, 2)
    );

    // Set dynamic draw usage on every attribute we plan on updating
    (
      this.particleGeometry.attributes.position as THREE.BufferAttribute
    ).setUsage(THREE.DynamicDrawUsage);
    (
      this.particleGeometry.attributes.particleData as THREE.BufferAttribute
    ).setUsage(THREE.DynamicDrawUsage);
    this.particleGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(),
      1000
    );

    this.particlePoints = new THREE.Points(this.particleGeometry, material);

    this.material = material;

    params.group.add(this.particlePoints);
  }

  updateFromParticles(
    particles: Particle[],
    params: EmitterParams,
    totalTimeElapsed: number
  ) {
    this.material!.uniforms.time.value = totalTimeElapsed;
    this.material!.uniforms.spinSpeed.value = params.spinSpeed;

    const positions = new Float32Array(particles.length * 3);
    const particleData = new Float32Array(particles.length * 2);

    for (let i = 0; i < particles.length; ++i) {
      const p = particles[i];
      positions[i * 3 + 0] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      particleData[i * 2 + 0] = p.life / p.maxLife;
      particleData[i * 2 + 1] = p.id;
    }

    (
      this.particleGeometry!.attributes.position as THREE.BufferAttribute
    ).copyArray(positions);
    (
      this.particleGeometry!.attributes.particleData as THREE.BufferAttribute
    ).copyArray(particleData);
    (
      this.particleGeometry!.attributes.position as THREE.BufferAttribute
    ).needsUpdate = true;
    (
      this.particleGeometry!.attributes.particleData as THREE.BufferAttribute
    ).needsUpdate = true;

    this.particleGeometry!.setDrawRange(0, particles.length);
  }
}

class Particle {
  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  life = 0;
  maxLife = 5;
  id = MATH.random();

  constructor() {}
}

// EmitterShape will define the volume where particles are created
class EmitterShape {
  constructor() {}

  emit() {
    return new Particle();
  }
}

class PointShape extends EmitterShape {
  position = new THREE.Vector3();
  positionRadiusVariance = 0;

  constructor() {
    super();
  }

  emit() {
    const p = new Particle();
    p.position.copy(this.position);

    const phi = MATH.random() * Math.PI * 2;
    const theta = MATH.random() * Math.PI;
    const radius = MATH.random() * this.positionRadiusVariance;

    const dir = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );
    dir.multiplyScalar(radius);
    p.position.add(dir);

    return p;
  }
}

class ParticleAttractor {
  position = new THREE.Vector3();
  intensity = 1;
  radius = 1;

  constructor() {}
}

class EmitterParams {
  maxLife = 5;
  velocityMagnitude = 0;
  velocityMagnitudeVariance = 0;
  rotation = new THREE.Quaternion();
  rotationAngularVariance = 0;

  maxParticles = 100;
  maxEmission = 100;
  emissionRate = 1;
  gravity = false;
  gravityStrength = 1;
  dragCoefficient = DRAG;
  renderer: ParticleRenderer | null = null;
  spinSpeed = 0;

  attractors: ParticleAttractor[] = [];

  shape = new EmitterShape();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onCreated = (_p: Particle) => {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onStep = (_p: Particle) => {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDestroy = (_p: Particle) => {};

  constructor() {}
}

// Emitter will make particles
class Emitter {
  particles: Particle[] = [];
  emissionTime = 0;
  numParticlesEmitted = 0;
  params: EmitterParams;

  dead = false;

  constructor(params: EmitterParams) {
    this.params = params;
  }

  dispose() {
    if (this.params.onDestroy) {
      for (let i = 0; i < this.particles.length; ++i) {
        this.params.onDestroy(this.particles[i]);
      }
    }
    this.particles = [];

    if (this.params.renderer) {
      this.params.renderer.dispose();
    }
  }

  get StillActive() {
    if (this.dead) return false;
    return (
      this.numParticlesEmitted < this.params.maxEmission ||
      this.particles.length > 0
    );
  }

  stop() {
    this.params.maxEmission = 0;
  }

  kill() {
    this.dead = true;
  }

  canCreateParticle() {
    if (this.dead) return false;

    const secondsPerParticle = 1 / this.params.emissionRate;

    return (
      this.emissionTime >= secondsPerParticle &&
      this.particles.length < this.params.maxParticles &&
      this.numParticlesEmitted < this.params.maxEmission
    );
  }

  emitParticle() {
    const p = this.params.shape.emit();

    p.maxLife = this.params.maxLife;

    const phi = MATH.random() * Math.PI * 2;
    const theta = MATH.random() * this.params.rotationAngularVariance;

    p.velocity = new THREE.Vector3(
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi)
    );

    const velocity =
      this.params.velocityMagnitude +
      (MATH.random() * 2 - 1) * this.params.velocityMagnitudeVariance;

    p.velocity.multiplyScalar(velocity);
    p.velocity.applyQuaternion(this.params.rotation);

    if (this.params.onCreated) this.params.onCreated(p);
    return p;
  }

  updateEmission(timeElapsed: number) {
    if (this.dead) return;

    this.emissionTime += timeElapsed;
    const secondsPerParticle = 1 / this.params.emissionRate;

    while (this.canCreateParticle()) {
      this.emissionTime -= secondsPerParticle;
      this.numParticlesEmitted++;
      const particle = this.emitParticle();

      this.particles.push(particle);
    }
  }

  updateParticle(p: Particle, timeElapsed: number) {
    p.life += timeElapsed;
    p.life = Math.min(p.life, p.maxLife);

    // Update position based on velocity and gravity
    const forces = this.params.gravity
      ? MATH.gravity.clone()
      : new THREE.Vector3();
    forces.multiplyScalar(this.params.gravityStrength);
    forces.add(p.velocity.clone().multiplyScalar(-this.params.dragCoefficient));

    for (let i = 0; i < this.params.attractors.length; ++i) {
      const attractor = this.params.attractors[i];
      const direction = attractor.position.clone().sub(p.position);
      const distance = direction.length();
      direction.normalize();

      const attractorForce =
        attractor.intensity / (1 + (distance / attractor.radius) ** 2);
      forces.add(direction.multiplyScalar(attractorForce));
    }

    p.velocity.add(forces.multiplyScalar(timeElapsed));

    const displacement = p.velocity.clone().multiplyScalar(timeElapsed);
    p.position.add(displacement);

    this.params.onStep(p);

    if (p.life >= p.maxLife) {
      this.params.onDestroy(p);
    }
  }

  updateParticles(timeElapsed: number) {
    for (let i = 0; i < this.particles.length; ++i) {
      const p = this.particles[i];
      this.updateParticle(p, timeElapsed);
    }

    this.particles = this.particles.filter((p) => p.life < p.maxLife);
  }

  step(timeElapsed: number, totalTimeElapsed: number) {
    this.updateEmission(timeElapsed);
    this.updateParticles(timeElapsed);

    if (this.params.renderer) {
      this.params.renderer.updateFromParticles(
        this.particles,
        this.params,
        totalTimeElapsed
      );
    }
  }
}

export {
  ParticleSystem,
  ParticleRenderer,
  ParticleRendererParams,
  PointShape,
  ParticleAttractor,
  Emitter,
  EmitterParams,
  Particle,
  EmitterShape,
};
