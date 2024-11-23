#define START 0.0
#define END 1.0
#define ALPHA 0.5

uniform vec3 uColor;

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  // glow
  vec3 normal = normalize(vNormal);
  vec3 eye = normalize(-vPosition);
  float rim = smoothstep(START, END, 1.0 - dot(normal, eye));
  float ratio = clamp(rim, 0.0, 1.0);

  gl_FragColor = vec4(uColor * ratio, ALPHA + ratio);
}
