import { useThree } from "@react-three/fiber";
import { OrbitControls, Plane, Sphere } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RGBELoader, GroundedSkybox } from "three/addons";
import snowmanVertexShader from "./shaders/sphere/vertex.glsl";
import snowmanFragmentShader from "./shaders/sphere/fragment.glsl";
import shadowVertexShader from "./shaders/plane/vertex.glsl";
import shadowFragmentShader from "./shaders/plane/fragment.glsl";
import { Frost } from "./effects/Frost";
import { Particles } from "./Particles";

const rgbeLoader = new RGBELoader();
const colorString = "#09a7db";
const colorValue = new THREE.Color(colorString);

export const Scene: React.FC = () => {
  const { scene } = useThree();
  const snowmanMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const shadowMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const [bloomEnabled, setBloomEnabled] = useState(false);

  useEffect(() => {
    rgbeLoader.load("/snowy_park_01_2k.hdr", (environmentTexture) => {
      environmentTexture.mapping = THREE.EquirectangularReflectionMapping;
      const groundedSkybox = new GroundedSkybox(environmentTexture, 15, 90);
      groundedSkybox.position.y = 15;
      scene.add(groundedSkybox);
      groundedSkybox.material.color.setScalar(0.02);
      scene.environment = environmentTexture;
      scene.background = environmentTexture;
    });
  }, [scene]);

  useEffect(() => {
    if (!snowmanMaterialRef.current || !shadowMaterialRef.current) return;
    const color = new THREE.Color(colorString).multiplyScalar(
      bloomEnabled ? 3 : 1
    );
    snowmanMaterialRef.current.uniforms.uColor.value.set(color);
    shadowMaterialRef.current.uniforms.uColor.value.set(color);
  }, [bloomEnabled]);

  return (
    <>
      <EffectComposer>
        <Bloom intensity={3} radius={1} mipmapBlur />
        <Frost />
      </EffectComposer>
      <OrbitControls
        enableDamping
        rotateSpeed={0.2}
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.4}
        maxPolarAngle={Math.PI * 0.5}
        minAzimuthAngle={Math.PI * 0.9}
        maxAzimuthAngle={-Math.PI * 0.9}
        target={[0, 5, 0]}
      />
      <Sphere
        args={[4, 128, 128]}
        position={[0, 4, 0]}
        onPointerEnter={() => setBloomEnabled(true)}
        onPointerLeave={() => setBloomEnabled(false)}
      >
        <shaderMaterial
          ref={snowmanMaterialRef}
          vertexShader={snowmanVertexShader}
          fragmentShader={snowmanFragmentShader}
          uniforms={{
            uColor: new THREE.Uniform(colorValue),
          }}
          transparent
          blending={THREE.AdditiveBlending}
        />
      </Sphere>
      <Plane
        args={[20, 20]}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI * 0.5, 0, 0]}
      >
        <shaderMaterial
          ref={shadowMaterialRef}
          vertexShader={shadowVertexShader}
          fragmentShader={shadowFragmentShader}
          uniforms={{
            uColor: new THREE.Uniform(colorValue),
          }}
          transparent
          depthWrite={false}
        />
      </Plane>
      <Particles bloomEnabled={bloomEnabled} />
    </>
  );
};
