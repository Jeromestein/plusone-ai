export const overlayFragment = `varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tMudNormal;
uniform sampler2D tNoise;
uniform float uPosition; // -1 = fully out, 0 = fully covering, 1 = fully out (other side)
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uResolution;

// Sample pre-computed noise texture (normalized to [-1, 1])
float sampleNoise(vec2 uv) {
  return texture2D(tNoise, uv).r * 2.0 - 1.0;
}

void main() {
 vec2 uv=vUv; vec4 inputColor=texture2D(tDiffuse,vUv);
  // Early out if overlay is fully off-screen (|position| >= 1)
  if (abs(uPosition) >= 1.0) {
    gl_FragColor = inputColor;
    return;
  }

  // Mud texture for organic variation
  vec3 mudNormal = texture2D(tMudNormal, uv * 2.0).rgb;
  float mudOffset = (mudNormal.r - 0.5) * mix(0.3, 0.6, 0.5 + 0.5 * sin(uTime - uv.x * 10.0)) * 0.1;

  // Noise (sampled from pre-computed texture)
  float aspect = uResolution.x / uResolution.y;
  vec2 aspectUv = vec2(uv.x * aspect, uv.y) + vec2(0.0, uTime * 0.02);
  float noiseValue = sampleNoise(aspectUv * 0.375 - uTime * 0.00625);

  // Diagonal/curved wipe pattern
  float threshold = mix(uv.y, uv.x, smoothstep(0.6, -0.4, abs(uv.x - 0.4)) * 0.5);
  threshold = threshold * 2.0 - 1.0;
  threshold = threshold / 1.2 + noiseValue * 0.2 + mudOffset;
  threshold = threshold * 0.5 + 0.5;

  // Map position from -1 to 1 range:
  // -1 = wipe coming in (progress 0), 0 = fully visible (progress 1), 1 = wipe going out (progress 0 reversed)
  float progress;
  float thresholdFinal = threshold;
  if (uPosition <= 0.0) {
    // -1 to 0: wipe in (progress goes from 0 to 1)
    progress = uPosition + 1.0;
  } else {
    // 0 to 1: wipe out (progress goes from 1 to 0, with reversed threshold)
    progress = 1.0 - uPosition;
    thresholdFinal = 1.0 - threshold;
  }

  // Sharp edge transition
  float edge = progress - thresholdFinal;
  float aa = fwidth(edge) * 10.0;
  float alpha = smoothstep(-aa, aa, edge);

  // Glow at edge
  float glowFactor = smoothstep(0.0, 0.005, abs(edge));
  vec3 color = pow(uColor, vec3(2.2));
  color = mix(color, color * mix(2.0, 4.0, 0.5 + 0.5 * sin(uTime + uv.x * 10.0)), 1.0 - glowFactor);

  gl_FragColor = vec4(mix(inputColor.rgb, color, alpha), 1.0);
}

`;

export const butterflyVertex = `uniform float uTime;
uniform float uSpeed;
uniform float uScale;

attribute vec4 instanceRandom;

varying vec2 vUv;
varying vec4 vRandom;

void main() {
  vUv = uv;
  vRandom = instanceRandom;

  vec3 pos = position;

  float flapSpeed = 4.0 + instanceRandom.y * 4.0;
  float flapAmp = 0.8 + instanceRandom.z * 0.5;
  float phase = instanceRandom.x * 6.28;

  float t = uTime * uSpeed * flapSpeed + phase;
  float wave = sin(t);
  wave += sin(t * 2.1 + instanceRandom.w * 3.14) * 0.2;
  wave += sin(t * 0.37 + instanceRandom.z * 5.0) * 0.3;

  float wingDist = abs(pos.x);
  float wingBlend = smoothstep(0.02, 0.4, wingDist);
  float asymmetry = 1.0 + sign(pos.x) * sin(t * 0.7 + instanceRandom.w * 6.28) * 0.08;

  float flapAngle = wave * flapAmp * wingBlend * asymmetry;
  float c = cos(flapAngle);
  float s = sin(flapAngle);
  float newX = pos.x * c - pos.y * s * sign(pos.x);
  float newY = pos.x * s * sign(pos.x) + pos.y * c;
  pos.x = newX;
  pos.y = newY;

  pos.y += smoothstep(1.0, -0.5, wave) * 0.25;

  pos *= uScale * (0.8 + instanceRandom.x * 0.4);

  vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

`;

export const butterflyFragment = `uniform sampler2D tMap;
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uTime;
uniform float uOpacity;
uniform float uHue;

varying vec2 vUv;
varying vec4 vRandom;

vec3 rgb2hsl(vec3 col) {
  float minc = min(col.r, min(col.g, col.b));
  float maxc = max(col.r, max(col.g, col.b));
  vec3 mask = step(col.grr, col.rgb) * step(col.bbg, col.rgb);
  vec3 h = mask * (vec3(0.0, 2.0, 4.0) + (col.gbr - col.brg) / (maxc - minc + 0.000001)) / 6.0;
  return vec3(
    fract(1.0 + h.x + h.y + h.z),
    (maxc - minc) / (1.0 - abs(minc + maxc - 1.0) + 0.000001),
    (minc + maxc) * 0.5
  );
}

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  vec2 uv = vUv;
  uv.y += 0.1 * vRandom.x;
  vec4 tex = texture2D(tMap, uv);

  vec3 hsl = rgb2hsl(tex.rgb);
  hsl.x = fract(hsl.x + uHue + vRandom.x * 0.05);
  vec3 color = hsl2rgb(hsl) * uColor;

  float pulse = sin(uTime * 3.0 + vRandom.a * 6.28) * 0.3 + 0.7;
  float edgeGlow = 2.0 - smoothstep(0.1, 0.9, vUv.x) - smoothstep(0.1, 0.9, vUv.y);
  color += uGlowColor * edgeGlow * 0.3 * pulse;

  color = pow(color, vec3(1.5));

  gl_FragColor = vec4(color, tex.a * uOpacity);
}

`;

export const globeVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const globeFragment = `
  uniform float uTime;
  uniform vec3 uColor;
  uniform sampler2D uColorMap;
  uniform float uOpacity;
  uniform float uHueShift;
  uniform float uHover;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) / 2.0;
    if (maxC == minC) return vec3(0.0, 0.0, l);
    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
    float h;
    if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
    else h = (c.r - c.g) / d + 4.0;
    return vec3(h / 6.0, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hsl2rgb(vec3 c) {
    if (c.y == 0.0) return vec3(c.z);
    float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
    float p = 2.0 * c.z - q;
    return vec3(
      hue2rgb(p, q, c.x + 1.0/3.0),
      hue2rgb(p, q, c.x),
      hue2rgb(p, q, c.x - 1.0/3.0)
    );
  }

  void main() {
    vec3 texColor = texture2D(uColorMap, vUv).rgb;
    texColor = pow(texColor, vec3(3.2));

    float scanline = sin(vUv.y * 300.0 + uTime * 10.0) * 0.3 + 0.5;
    scanline = mix(0.5, 1.0, pow(scanline, 2.0));

    float sweep = fract(-uTime * 0.15);
    float sweepLine = smoothstep(0.2, -0.2, abs(vUv.y + vPosition.z * 0.4 - sweep));
    sweepLine = pow(sweepLine, 2.0) * 1.0;

    float land = 1.0 - length(texColor);
    vec3 finalColor = vec3(0.2 + land) * uColor;
    finalColor *= scanline;
    finalColor += sweepLine * uColor;

    finalColor += land * (0.5 + sin(uTime * 2.5 + vPosition.z * 5.0 + length(vPosition.xy) * 10.0) * 0.5) * 0.3 * uColor;

    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 4.0);

    finalColor = pow(finalColor, vec3(1.2));

    vec3 finalHsl = rgb2hsl(finalColor);
    finalHsl.x = fract(finalHsl.x + 0.8 + vUv.y * 0.2 + 0.55);
    finalColor = hsl2rgb(finalHsl);

    finalColor *= mix(0.9, 1.25, uHover) + sin(uTime * 2.0 + vPosition.y * 0.2) * 0.5;

    finalColor.rgb += length(texColor) * uColor * 0.5;

    vec3 lines = vec3(pow(fresnel, 2.0)) * 0.2 * smoothstep(0.5, 0.0, abs(vPosition));
    vec3 linesHsl = rgb2hsl(lines);
    linesHsl.x = fract(linesHsl.x * mix(0.05, 0.2, uHover) + 0.02);
    lines = hsl2rgb(linesHsl);
    lines *= mix(1.0, 0.0, smoothstep(0.5, 0.1, vUv.y));
    lines *= mix(0.5, 1.5, uHover);

    finalColor = mix(pow(finalColor, vec3(1.0)) * 0.8, lines, 0.2);

    finalColor *= mix(1.0, 0.0, smoothstep(0.8, 0.2, vUv.y));

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

export const hatFragment = `varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform sampler2D tHatMask;
uniform sampler2D tMudNormal;
uniform sampler2D tNoise;
uniform float uInvertedSobelActive;
uniform float uHatHover;
uniform float uModalAnimation;
uniform float uIsModalAnimating;
uniform vec3 uInvertedSobelColor;
uniform vec2 uInvertedSobelFadeCenter;
uniform vec2 uResolution;
uniform float uTime;

float sampleNoise(vec2 uv) {
  return texture2D(tNoise, uv).r * 2.0 - 1.0;
}

float hatLuminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

// Sobel edge detection on alpha channel
float sobelAlpha(sampler2D tex, vec2 uv, vec2 texel) {
  float l = texture2D(tex, uv + vec2(-texel.x, 0.0)).a;
  float r = texture2D(tex, uv + vec2(texel.x, 0.0)).a;
  float t = texture2D(tex, uv + vec2(0.0, texel.y)).a;
  float b = texture2D(tex, uv + vec2(0.0, -texel.y)).a;
  return length(vec2(r - l, t - b)) * 2.0;
}

// Sobel edge detection on scene luminance
float sobelScene(vec2 uv, vec2 texel) {
  float l = hatLuminance(texture2D(tDiffuse, uv + vec2(-texel.x, 0.0)).rgb);
  float r = hatLuminance(texture2D(tDiffuse, uv + vec2(texel.x, 0.0)).rgb);
  float t = hatLuminance(texture2D(tDiffuse, uv + vec2(0.0, texel.y)).rgb);
  float b = hatLuminance(texture2D(tDiffuse, uv + vec2(0.0, -texel.y)).rgb);
  return length(vec2(r - l, t - b));
}

void main() { vec2 uv=vUv; vec4 inputColor=texture2D(tDiffuse,vUv);
  gl_FragColor = inputColor;
  if (uInvertedSobelActive < 0.5) return;

  float aspect = uResolution.y / uResolution.x;
  float hatAlpha = texture2D(tHatMask, uv).a;

  // Hat hover outline
  if (uHatHover > 0.0) {
    float outline = smoothstep(0.0, 1.0, pow(sobelAlpha(tHatMask, uv, 2. / uResolution), 2.0));
    gl_FragColor.rgb += vec3(outline * (1.0 - hatAlpha) * uHatHover);
  }

  if (uIsModalAnimating > 0.5) {
    float progress = smoothstep(0.0, 1.5, uModalAnimation);

    // Noise + mud texture for organic edge
    vec2 aspectUv = vec2(uv.x, uv.y * aspect);
    float noise = sampleNoise(aspectUv * .25 + uTime * 0.1);
    float mudStrength = mix(0.2, 0.4, 0.5 + 0.5 * sin(uTime - uv.x * 10.0));
    float mud = (texture2D(tMudNormal, uv).r - 0.5) * mudStrength * .5;

    // Circular reveal from center
    float dist = length((uv - uInvertedSobelFadeCenter) * vec2(1.0, aspect));
    float threshold = dist - noise * 0.2 - mud;
    float mask = smoothstep(progress * 1.5 + 0.02, progress * 1.5 - 0.02, threshold);

    // Black sobel lines on white (scale with resolution)
    float edges = sobelScene(uv, 1.2 / uResolution);

    vec3 sketchColor = pow(uInvertedSobelColor, vec3(2.2))  ;
    sketchColor *= 1.0 - smoothstep(0., .4, edges) * .7;

    // Apply sketch only outside hat, blend with scene
    vec3 effectColor = mix(sketchColor, inputColor.rgb, hatAlpha);
    gl_FragColor.rgb = mix(inputColor.rgb, effectColor, mask);
  }
}
`;
