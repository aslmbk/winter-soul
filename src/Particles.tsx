import { useEffect, useRef } from "react";
import { ParticleSystem } from "./particle-system/ParticleSystem";
import { TextureArrayLoader } from "./particle-system/TextureAtlas";
import * as THREE from "three";
import * as MATH from "./particle-system/Math";
import * as PARTICLES from "./particle-system/ParticleSystem";
import snowflakeVertexShader from "./shaders/points/vertex.glsl";
import snowflakeFragmentShader from "./shaders/points/fragment.glsl";
import { useFrame, useThree } from "@react-three/fiber";

const textureArrayLoader = new TextureArrayLoader();

class PlaneShape extends PARTICLES.EmitterShape {
  transform = new THREE.Matrix4();
  dimensions = new THREE.Vector2(1, 1);

  constructor(dimensions: THREE.Vector2, transform: THREE.Matrix4) {
    super();

    this.transform.copy(transform);
    this.dimensions.copy(dimensions);
  }

  emit() {
    const p = new PARTICLES.Particle();
    p.position.set(
      MATH.randomRange(-this.dimensions.x, this.dimensions.x),
      0,
      MATH.randomRange(-this.dimensions.y, this.dimensions.y)
    );
    p.position.applyMatrix4(this.transform);

    return p;
  }
}

const snowflakeTextureNames = [
  "/snowflake1.png",
  "/snowflake2.png",
  "/snowflake3.png",
];

const sizeOverLife = new MATH.FloatInterpolant([
  { time: 0, value: 1500 },
  { time: 5, value: 1500 },
]);
const twinkleOverLife = new MATH.FloatInterpolant([
  { time: 0, value: 1 },
  { time: 5, value: 1 },
]);
const alphaOverLife = new MATH.FloatInterpolant([
  { time: 0, value: 1 },
  { time: 5, value: 1 },
]);
const colorOverLife = new MATH.ColorInterpolant([
  { time: 0, value: new THREE.Color(1, 1, 1).convertSRGBToLinear() },
  { time: 5, value: new THREE.Color(1, 1, 1).convertSRGBToLinear() },
]);
const colorOverLifeBloom = new MATH.ColorInterpolant([
  { time: 0, value: new THREE.Color(2, 2, 2).convertSRGBToLinear() },
  { time: 5, value: new THREE.Color(2, 2, 2).convertSRGBToLinear() },
]);
const additiveOverLife = new MATH.FloatInterpolant([
  { time: 0, value: 0 },
  { time: 5, value: 0 },
]);
const snowPlaneTransform = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 20, 0),
  new THREE.Quaternion(),
  new THREE.Vector3(15, 15, 15)
);
const snowPlane = new PlaneShape(new THREE.Vector2(1, 1), snowPlaneTransform);
const snowflakeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: new THREE.Uniform(0),
    map: new THREE.Uniform(null),
    sizeOverLife: new THREE.Uniform(sizeOverLife.toTexture()),
    colourOverLife: new THREE.Uniform(colorOverLife.toTexture(alphaOverLife)),
    twinkleOverLife: new THREE.Uniform(twinkleOverLife.toTexture()),
    additiveOverLife: new THREE.Uniform(additiveOverLife.toTexture()),
    spinSpeed: new THREE.Uniform(0),
    lightFactor: new THREE.Uniform(1),
    lightIntensity: new THREE.Uniform(2),
    skyLight: new THREE.Uniform(
      new THREE.Color(0.86, 0.93, 0.98).convertSRGBToLinear()
    ),
    downLight: new THREE.Uniform(
      new THREE.Color(0.91, 0.88, 0.84).convertSRGBToLinear()
    ),
    numSnowTextures: new THREE.Uniform(snowflakeTextureNames.length),
  },
  vertexShader: snowflakeVertexShader,
  fragmentShader: snowflakeFragmentShader,
  transparent: true,
  depthWrite: false,
  depthTest: true,
  blending: THREE.AdditiveBlending,
  //   blending: THREE.CustomBlending,
  //   blendEquation: THREE.AddEquation,
  //   blendSrc: THREE.OneFactor,
  //   blendDst: THREE.OneMinusSrcAlphaFactor,
});
textureArrayLoader.load(snowflakeTextureNames, (textureArray) => {
  snowflakeMaterial.uniforms.map.value = textureArray;
});

interface ParticlesProps {
  bloomEnabled: boolean;
}

export const Particles: React.FC<ParticlesProps> = ({ bloomEnabled }) => {
  const particleSystemRef = useRef<ParticleSystem>();

  const { scene } = useThree();
  useFrame(({ clock }, delta) => {
    if (particleSystemRef.current) {
      particleSystemRef.current.step(delta, clock.getElapsedTime());
    }
  });

  useEffect(() => {
    if (bloomEnabled) {
      snowflakeMaterial.uniforms.colourOverLife.value =
        colorOverLifeBloom.toTexture(alphaOverLife);
    } else {
      snowflakeMaterial.uniforms.colourOverLife.value =
        colorOverLife.toTexture(alphaOverLife);
    }
  }, [bloomEnabled]);

  useEffect(() => {
    particleSystemRef.current = new ParticleSystem();
    const snowRendererParams = new PARTICLES.ParticleRendererParams();
    snowRendererParams.maxParticles = 2000;

    const snowEmitterParams = new PARTICLES.EmitterParams();
    snowEmitterParams.shape = snowPlane;
    snowEmitterParams.maxLife = 6;
    snowEmitterParams.maxParticles = 2000;
    snowEmitterParams.emissionRate = 200;
    snowEmitterParams.maxEmission = Number.MAX_SAFE_INTEGER;
    snowEmitterParams.gravity = true;
    snowEmitterParams.spinSpeed = Math.PI / 2;
    snowEmitterParams.dragCoefficient = 2.0;

    const renderer = new PARTICLES.ParticleRenderer();
    renderer.initialize(snowflakeMaterial, snowRendererParams);
    snowEmitterParams.renderer = renderer;

    particleSystemRef.current.addEmitter(
      new PARTICLES.Emitter(snowEmitterParams)
    );
    scene.add(snowRendererParams.group);

    return () => {
      scene.remove(snowRendererParams.group);
      particleSystemRef.current?.dispose();
    };
  }, [scene]);

  return null;
};
