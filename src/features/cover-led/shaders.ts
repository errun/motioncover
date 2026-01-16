export const vertexShader = /* glsl */ `
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uAudioLow;

  varying vec2 vUv;
  varying float vDisplacement;

  void main() {
    vUv = uv;

    float displacement = uAudioLow * 0.15;
    float wave = sin(uv.x * 3.14159 + uTime * 0.5) * sin(uv.y * 3.14159 + uTime * 0.5);
    displacement += wave * uAudioLow * 0.05;

    vDisplacement = displacement;

    vec3 newPosition = position;
    newPosition.z += displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uAudioLow;
  uniform float uAudioMid;
  uniform float uAudioHigh;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;

  varying vec2 vUv;
  varying float vDisplacement;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  float filmGrain(vec2 uv, float time) {
    return random(uv + fract(time)) * 0.08;
  }

  vec2 coverUV(vec2 uv, vec2 canvasRes, vec2 imageRes) {
    float canvasAspect = canvasRes.x / canvasRes.y;
    float imageAspect = imageRes.x / imageRes.y;

    vec2 ratio = vec2(
      min(canvasAspect / imageAspect, 1.0),
      min(imageAspect / canvasAspect, 1.0)
    );

    vec2 newUv = uv;
    newUv -= 0.5;
    newUv *= ratio;
    newUv += 0.5;

    return newUv;
  }

  vec3 rgb2hsl(vec3 c) {
    float maxC = max(max(c.r, c.g), c.b);
    float minC = min(min(c.r, c.g), c.b);
    float l = (maxC + minC) / 2.0;
    float s = 0.0;
    float h = 0.0;

    if (maxC != minC) {
      float d = maxC - minC;
      s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

      if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
      else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
      else h = (c.r - c.g) / d + 4.0;
      h /= 6.0;
    }
    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x, s = hsl.y, l = hsl.z;
    if (s == 0.0) return vec3(l);
    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;
    return vec3(
      hue2rgb(p, q, h + 1.0/3.0),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1.0/3.0)
    );
  }

  void main() {
    vec2 uv = coverUV(vUv, uResolution, uImageResolution);

    float zoom = 1.0 - uAudioMid * 0.05;
    uv = (uv - 0.5) * zoom + 0.5;

    float aberration = uAudioHigh * 0.02;

    float r = texture2D(uTexture, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(aberration, 0.0)).b;

    vec3 color = vec3(r, g, b);

    float breathBrightness = 1.0 + uAudioLow * 0.8;
    color *= breathBrightness;

    color = mix(color, color * color * 1.2, uAudioLow * 0.3);

    vec3 hsl = rgb2hsl(color);
    hsl.y = min(hsl.y * (1.0 + uAudioMid * 0.5), 1.0);
    color = hsl2rgb(hsl);

    float grain = filmGrain(vUv, uTime);
    color += grain - 0.04;

    float vignetteStrength = 0.3 - uAudioLow * 0.15;
    float vignette = 1.0 - length(vUv - 0.5) * vignetteStrength;
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;
