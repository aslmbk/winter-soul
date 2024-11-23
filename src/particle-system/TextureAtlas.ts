import * as THREE from "three";

// Taken from https://github.com/mrdoob/three.js/issues/758
const getImageData = (image: OffscreenCanvas) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to get 2D context");
  context.translate(0, image.height);
  context.scale(1, -1);
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
};

class TextureArrayLoader {
  constructor() {}

  load(
    names: string[],
    callback: (textureArray: THREE.DataArrayTexture | null) => void
  ) {
    const manager = new THREE.LoadingManager();
    const loader = new THREE.TextureLoader(manager);
    const textures = names.map((n) => loader.load(n));
    manager.onLoad = () => {
      const textureArray = this.onLoad(textures);
      callback(textureArray);
    };
  }

  onLoad(textures: THREE.Texture[]) {
    let X: number | null = null;
    let Y: number | null = null;
    let data: Uint8Array | null = null;

    for (let t = 0; t < textures.length; t++) {
      const curData = getImageData(textures[t].image);
      const h = curData.height;
      const w = curData.width;

      if (X === null) {
        X = w;
        Y = h;
        data = new Uint8Array(textures.length * 4 * X * Y);
      }

      if (w !== X || h !== Y) {
        console.error("Texture dimensions do not match");
        return null;
      }

      const offset = t * (4 * w * h);
      data!.set(curData.data, offset);
    }

    const diffuse = new THREE.DataArrayTexture(data, X!, Y!, textures.length);
    diffuse.format = THREE.RGBAFormat;
    diffuse.type = THREE.UnsignedByteType;
    diffuse.minFilter = THREE.LinearMipMapLinearFilter;
    diffuse.magFilter = THREE.LinearFilter;
    diffuse.wrapS = THREE.ClampToEdgeWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.generateMipmaps = true;
    diffuse.needsUpdate = true;

    return diffuse;
  }
}

export { TextureArrayLoader };
