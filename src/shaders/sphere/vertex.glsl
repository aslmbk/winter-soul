#define AMPLITUDE 0.4
#define FREQUENCY 0.95

varying vec3 vPosition;
varying vec3 vNormal;

void main() {
  vec4 pos = vec4(position, 1.0);
  float ratio = (abs(sin(position.y * FREQUENCY + 1.6)) + 1.0) * AMPLITUDE;
  pos.xz *= ratio;

  pos = modelViewMatrix * pos;
  vPosition = pos.xyz;
  vNormal = normalMatrix * normal;

  gl_Position = projectionMatrix * pos;
}
