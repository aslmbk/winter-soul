import { useTexture } from "@react-three/drei";
import { FrostEffect } from "./FrostEffect";

export const Frost = () => {
  const texture = useTexture("/frost.jpg");
  const effect = new FrostEffect({ texture });
  return <primitive object={effect} />;
};

useTexture.preload("/frost.jpg");
