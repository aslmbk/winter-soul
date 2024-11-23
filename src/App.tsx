import { Canvas } from "@react-three/fiber";
import { Scene } from "./Scene";

export const App: React.FC = () => {
  return (
    <Canvas camera={{ position: [0, 0, 30], fov: 30 }}>
      <Scene />
    </Canvas>
  );
};
