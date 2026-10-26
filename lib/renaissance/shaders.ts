// Adapted from the publicly served Renaissance transition shaders.
// These shaders are compiled by our own Next.js / Three.js implementation.

export const transitionFragment = `uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform sampler2D tMudNormal;
uniform sampler2D tNoise;
uniform float uProgress;
uniform float uAspect;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uIsHero;
uniform float uIsFallback;
uniform mat4 uProjectionView;
uniform vec3 uFadeCenterPoint;
uniform float uDarken;

// Sample pre-computed noise texture (normalized to [-1, 1])
float sampleNoise(vec2 uv) {
  return texture2D(tNoise, uv).r * 2.0 - 1.0;
}

float easeInOutCubic(float t) {
  return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}

varying vec2 vUv;
void main() {
  vec2 uv = vUv;
  vec4 outputColor;
  bool isHero = uIsHero > 0.5;
  bool isFallback = uIsFallback > 0.5;

  // Progress smoothing differs between modes
  float progress = isHero ? smoothstep(0.0, 1.5, uProgress) : uProgress;

  // Project 3D fade center point to screen space (fallback uses fixed center)
  vec2 sceneCenter;
  if (isFallback) {
    sceneCenter = vec2(0.5, 0.65);
  } else {
    vec4 clipPos = uProjectionView * vec4(uFadeCenterPoint, 1.0);
    sceneCenter = (clipPos.xy / clipPos.w) * 0.5 + 0.5;
  }

  // UV transformation (fancy mode has zoom effect centered on 3D scene origin)
  vec2 currentUV = uv;
  vec2 nextUV = uv;
  if (isHero) {
    currentUV = (uv - sceneCenter) * (1.0 - smoothstep(0.2, 1.0, uProgress) * 0.1) + sceneCenter;
    nextUV = (uv - sceneCenter) * (1.0 + smoothstep(0.8, 0.0, uProgress) * 0.1) + sceneCenter;
  } else {
    if (isFallback) {
      currentUV.y -= easeInOutCubic(uProgress) * 0.1;
      nextUV.y += easeInOutCubic(1.0-uProgress) * 0.1;
    }
  }

  vec4 current = texture2D(tCurrent, currentUV);
  vec4 next = texture2D(tNext, nextUV);

  // Edge detection using hardware derivatives (fwidth) - only compute during transitions
  vec3 currentEdges = vec3(0.0);
  vec3 nextEdges = vec3(0.0);
  if (uProgress > 0.01 && uProgress < 0.99 || uDarken > 0.001) {
    float currentLuma = dot(current.rgb, vec3(0.299, 0.587, 0.114));
    currentEdges = vec3(fwidth(currentLuma) * mix(5.0, 10.0, progress));
    float nextLuma = dot(next.rgb, vec3(0.299, 0.587, 0.114));
    nextEdges = vec3(fwidth(nextLuma) * mix(5.0, 10.0, 1.0 - progress));
  }

  // Mud normal offset
  vec3 mudNormal = texture2D(tMudNormal, uv * 2.0).rgb;
  float mudStrength = isHero ? mix(0.2, 0.4, 0.5 + 0.5 * sin(uTime - uv.x * 10.0))
                              : mix(0.3, 0.6, 0.5 + 0.5 * sin(uTime - uv.x * 10.0));
  float mudOffset = (mudNormal.r - 0.5) * mudStrength;

  // Noise (sampled from pre-computed texture)
  vec2 aspectUv = vec2(uv.x * uAspect, uv.y) + vec2(0.0, uTime * 0.02);
  float noiseSpeed = isHero ? 0.07 : 0.05;
  float currentNoise = sampleNoise(aspectUv * 0.25 - uTime * noiseSpeed * 0.125);

  // Mask center (hero uses 3D scene center with mouse influence)
  vec2 maskCenter = isHero ? mix(sceneCenter, uMouse, 0.1) : vec2(0.5);

  // Threshold calculation
  float threshold;
  if (isHero) {
    // Aspect-correct the distance for circular (not oval) reveal
    float dist = length((uv - maskCenter) * vec2(uAspect, 1.0)) * 0.8;
    threshold = mix(dist, uv.x, smoothstep(0.6, -0.4, abs(uv.x-sceneCenter.x)) * mix(0.0, 0.4, smoothstep(0.05, 0.5, progress)));
    threshold = mix(threshold, 0.0, smoothstep(0.9, 1.0, uProgress));
  } else {
    float ease = mix(progress * progress * (3.0 - 2.0 * progress), progress, 0.25);
    threshold = mix(uv.y, uv.x, smoothstep(0.6, -0.4, abs(uv.x-0.5)) * 0.5);
    progress = ease; // Use eased progress for simple mode
  }
  threshold = threshold * 2.0 - 1.0;
  threshold = threshold / 1.2 + currentNoise * 0.2 + mudOffset;
  threshold = threshold * 0.5 + 0.5;

  float edge = progress - threshold;
  float aa = fwidth(edge) * 10.0;
  float blendFactor = smoothstep(-aa, aa, edge);

  // Edge mixing
  current = mix(current, vec4(currentEdges, 1.0), smoothstep(0.0, 0.5, progress));
  next = mix(next, vec4(nextEdges, 1.0), smoothstep(0.2, 0.8, 1.0 - progress));

  if (uDarken > 0.001) {
    current = mix(current, vec4(0.02 * uDarken + currentEdges * 0.1, 1.0), uDarken);
  }

  outputColor = mix(current, next, blendFactor);

  // Glow effect
  float glowStrength = isHero ? mix(40.0, 8.0, smoothstep(0.05, 0.25, progress)) : mix(2.0, 10.0, 0.5);
  float glowThreshold = isHero ? glowStrength * 0.001 : 0.003;
  float glowFactor = smoothstep(0.0, glowThreshold, abs(edge));
  float glowMult = isHero ? mix(glowStrength * 0.5, glowStrength, 0.5 + 0.5 * currentNoise * sin(uTime + uv.x * 10.0))
                          : mix(2.0, 10.0, 0.5 + 0.5 * currentNoise * sin(uTime + uv.x * 10.0));
  outputColor = mix(outputColor, outputColor * glowMult, 1.0 - glowFactor);
  gl_FragColor = outputColor;
}`;

export const visibilityNoise = `
  vec3 hash(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(in vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(
        mix(dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
            dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
        mix(dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
            dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
      mix(
        mix(dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
            dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
        mix(dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
            dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
  }

  float fbm(vec3 p) {
    mat3 m = mat3(0.00, 0.80, 0.60,
                 -0.80, 0.36, -0.48,
                 -0.60, -0.48, 0.64);
    float f = 0.0;
    vec3 q = 8.0 * p;
    f += 0.5000 * noise(q); q = m * q * 2.01;
    f += 0.2500 * noise(q); q = m * q * 2.02;
    f += 0.1250 * noise(q); q = m * q * 2.03;
    f += 0.0625 * noise(q);
    return f;
  }
`;

export const visibilityFragment = `
  float combinedVisibility = uVisibility * uLoadingVisibility;

  if(combinedVisibility < 1.) {
    vec2 mudUv = vRenaissanceWorld.xy;
    vec3 mudNormal = texture2D(uMudNormal, mudUv).rgb;
    float mudOffset = (mudNormal.r - 0.5) * 0.5;

    float cameraDist = length(cameraPosition - vRenaissanceWorld);
    float noiseScale = 0.15;
    float noiseValue = fbm(vRenaissanceWorld * noiseScale * 0.25 + length(vRenaissanceWorld.xy) * 0.025 + 2.0 + uTime * 0.0015 + uVisibility * 0.05);
    noiseValue = smoothstep(-.5, .5, noiseValue);
    noiseValue += mudOffset * smoothstep(0.5, 0.45, abs(combinedVisibility-0.5));

    float transition = smoothstep(combinedVisibility, combinedVisibility - 0.1, length(vRenaissanceWorld.xy) * 0.06);
    transition = mix(transition, noiseValue, mix(0.3, 0.8, combinedVisibility));
    transition = mix(transition, 1.0, smoothstep(0.5, 1.0, combinedVisibility));

    float threshold = 1.0 - combinedVisibility;
    if (transition < threshold) {
      discard;
    }

    float edgeWidth = 0.02;
    float edge = smoothstep(threshold, threshold + edgeWidth, transition);
    gl_FragColor.rgb = mix(gl_FragColor.rgb * 8.0, gl_FragColor.rgb, edge);
  }
`;

// Particle shader equations adapted from the public scene, with native Three.js ownership.
export const particleVertex = `attribute vec3 velocity;
attribute float phase;
attribute float sizeScale;

uniform float uSize;
uniform float uSizeVariation;
uniform float uTime;
uniform float uSpeed;
uniform float uTurbulence;
uniform float uBlinkSpeed;
uniform float uBlinkMin;
uniform sampler2D tNoise;

varying float vAlpha;

float sampleNoise(vec2 uv) {
  return texture2D(tNoise, uv).r * 2.0 - 1.0;
}

void main() {
  vec3 animatedPos = position + velocity * uTime * uSpeed * 0.01;
  animatedPos = fract(animatedPos * 0.5 + 0.5) * 2.0 - 1.0;

  if (uTurbulence > 0.0) {
    vec3 noisePos = position * 2.0 + uTime * 0.1;
    animatedPos.x += sampleNoise(noisePos.xy * 0.125) * uTurbulence * 0.1;
    animatedPos.y += sampleNoise(noisePos.yz * 0.125) * uTurbulence * 0.1;
    animatedPos.z += sampleNoise(noisePos.zx * 0.125) * uTurbulence * 0.1;
  }

  vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);

  float variationScale = mix(1.0, sizeScale, uSizeVariation);
  gl_PointSize = uSize * variationScale * (200.0 / -mvPosition.z);

  float blinkWave = sin(uTime * uBlinkSpeed + phase) * 0.5 + 0.5;
  float blink = uBlinkSpeed > 0.0 ? uBlinkMin + (1.0 - uBlinkMin) * blinkWave : 1.0;

  vAlpha = blink;

  gl_Position = projectionMatrix * mvPosition;
}
`;
export const particleFragment = `uniform vec3 uColor;
uniform float uOpacity;
uniform float uBlur;

varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord * 2. - 1.;
  float dist = 1. - min(1., length(center));
  float blur = 1. - pow(uBlur, 2.); // Invert blur to match previous theatrejs setup
  float alphaFalloff = smoothstep(0.0, blur, dist);
  gl_FragColor = vec4(uColor, uOpacity * alphaFalloff * vAlpha);
}
`;
