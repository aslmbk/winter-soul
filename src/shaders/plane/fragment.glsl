#define RADIUS 0.1
#define SMOOTH 0.3

uniform vec3 uColor;

varying vec2 vUv;

void main() {
  float distance = length(vUv - 0.5);
  float circle = 1.0 - smoothstep(RADIUS - SMOOTH, RADIUS + SMOOTH, distance);
  vec4 color = vec4(uColor, 1.0) * circle;
  gl_FragColor = color;
}
