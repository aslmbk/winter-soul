import { Effect } from "postprocessing";
import * as THREE from "three";
import frostFragmentShader from "../shaders/effect/frost.glsl";

export class FrostEffect extends Effect {
  constructor({ texture }: { texture: THREE.Texture }) {
    super("FrostEffect", frostFragmentShader, {
      uniforms: new Map([["uTexture", new THREE.Uniform(texture)]]),
    });
  }
}
