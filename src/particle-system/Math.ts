import MersenneTwister from "mersenne-twister";
import { createNoise2D } from "simplex-noise";
import * as THREE from "three";

const mt = new MersenneTwister(1);
const noiseCreator = createNoise2D();
export const gravity = new THREE.Vector3(0, -9.8, 0);

export const noise1D = (x: number) => noiseCreator(x, x);
export const noise2D = (x: number, y: number) => noiseCreator(x, y);

export const saturate = (v: number) => Math.min(Math.max(v, 0), 1);
export const inverseLerp = (a: number, b: number, v: number) =>
  saturate((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const remap = (a: number, b: number, c: number, d: number, v: number) =>
  lerp(c, d, inverseLerp(a, b, v));
export const clamp = (min: number, max: number, v: number) =>
  Math.min(Math.max(v, min), max);
export const random = mt.random.bind(mt);
export const randomRange = (min: number, max: number) =>
  lerp(min, max, random());

interface Frame<T = number[]> {
  time: number;
  value: T;
}

export class Interpolant<T> {
  frames: Frame<number[]>[];
  frameBuffer: Float32Array;
  interpolator: THREE.LinearInterpolant;

  constructor(frames: Frame<number[]>[]) {
    this.frames = frames;
    const times: number[] = [];
    const values: number[] = [];

    frames.forEach((frame) => {
      times.push(frame.time);
      values.push(...frame.value);
    });

    const stride = frames[0].value.length;

    this.frameBuffer = new Float32Array(stride);
    this.interpolator = new THREE.LinearInterpolant(
      times,
      values,
      stride,
      this.frameBuffer
    );
  }

  evaluate(time: number) {
    this.interpolator.evaluate(time);
    return this.result;
  }

  get result(): T {
    return this.frameBuffer as T;
  }
}

export class Vector3Interpolant extends Interpolant<THREE.Vector3> {
  constructor(frames: Frame<THREE.Vector3>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value.x, frame.value.y, frame.value.z],
    }));
    super(framesWithValues);
  }

  get result() {
    return new THREE.Vector3(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2]
    );
  }
}

export class FloatInterpolant extends Interpolant<number> {
  constructor(frames: Frame<number>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value],
    }));
    super(framesWithValues);
  }

  get result() {
    return this.frameBuffer[0];
  }

  toTexture() {
    const maxFrameTime = this.frames[this.frames.length - 1].time;

    let smallestStep = 0.5;
    for (let i = 1; i < this.frames.length - 1; i++) {
      const stepSize =
        (this.frames[i].time - this.frames[i - 1].time) / maxFrameTime;
      smallestStep = Math.min(smallestStep, stepSize);
    }

    const recommendedSize = Math.ceil(1 / smallestStep);
    const width = recommendedSize + 1;
    const data = new Float32Array(width);

    for (let i = 0; i < width; i++) {
      const t = i / recommendedSize;
      data[i] = this.evaluate(t * maxFrameTime);
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      1,
      THREE.RedFormat,
      THREE.FloatType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }
}

export class ColorInterpolant extends Interpolant<THREE.Color> {
  constructor(frames: Frame<THREE.Color>[]) {
    const framesWithValues = frames.map((frame) => ({
      time: frame.time,
      value: [frame.value.r, frame.value.g, frame.value.b],
    }));
    super(framesWithValues);
  }

  get result() {
    return new THREE.Color(
      this.frameBuffer[0],
      this.frameBuffer[1],
      this.frameBuffer[2]
    );
  }

  toTexture(alphaInterpolant: FloatInterpolant) {
    const maxFrameTime = Math.max(
      this.frames[this.frames.length - 1].time,
      alphaInterpolant.frames[alphaInterpolant.frames.length - 1].time
    );

    let smallestStep = 0.5;
    for (let i = 1; i < this.frames.length - 1; i++) {
      const stepSize =
        (this.frames[i].time - this.frames[i - 1].time) / maxFrameTime;
      smallestStep = Math.min(smallestStep, stepSize);
    }
    for (let i = 1; i < alphaInterpolant.frames.length - 1; i++) {
      const stepSize =
        (alphaInterpolant.frames[i].time -
          alphaInterpolant.frames[i - 1].time) /
        maxFrameTime;
      smallestStep = Math.min(smallestStep, stepSize);
    }

    const recommendedSize = Math.ceil(1 / smallestStep);
    const width = recommendedSize + 1;
    const data = new Float32Array(width * 4);

    for (let i = 0; i < width; i++) {
      const t = i / recommendedSize;
      const color = this.evaluate(t * maxFrameTime);
      data[i * 4 + 0] = color.r;
      data[i * 4 + 1] = color.g;
      data[i * 4 + 2] = color.b;
      data[i * 4 + 3] = alphaInterpolant.evaluate(t * maxFrameTime);
    }

    const texture = new THREE.DataTexture(
      data,
      width,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    return texture;
  }
}
