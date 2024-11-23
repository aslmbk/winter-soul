uniform sampler2D uTexture;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 color = texture(uTexture, uv);
  color = pow(color, vec4(6.0));
  float distToCenter = length(uv - 0.5);
  outputColor = mix(inputColor, color, smoothstep(0.55, 0.9, distToCenter) * color.a);
}
