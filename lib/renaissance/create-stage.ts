import * as THREE from "three";
import {
  cameraMotion,
  updateCamera,
  originalCameraDefaults as cameraDefaults,
  animationKey,
} from "./camera";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BloomPass } from "./BloomPass";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { SMAAWeightsShader } from "three/addons/shaders/SMAAShader.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { createKeySender } from "./key-transport";
import { createExtras, type Extras } from "./scene-extras";
import sceneManifest from "./data/scenes.json";
import { overlayFragment, hatFragment } from "./scene-shaders";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { assets } from "./assets";
import { Timeline, type TimelineData } from "./timeline";
import { createNoiseTexture } from "./noise";
import {
  transitionFragment,
  visibilityFragment,
  visibilityNoise,
  particleVertex,
  particleFragment,
} from "./shaders";

type Vector = { x: number; y: number; z: number };
type Transform = {
  position: Vector;
  rotation: Vector;
  scale: Vector;
  visibility: number;
  responsive: string;
  roughness: number;
  metalness: number;
  frameProgress: number;
  frame: number;
  autoRotate: { enabled: boolean; speed: number };
  animations: Record<string, { progress: number; loop: boolean }>;
};
const vector = (x = 0, y = 0, z = 0): Vector => ({ x, y, z });
const transformDefaults: Transform = {
  position: vector(),
  rotation: vector(),
  scale: vector(1, 1, 1),
  visibility: 1,
  responsive: "none",
  roughness: 1,
  metalness: 0,
  animations: {},
  frameProgress: 0,
  frame: -1,
  autoRotate: { enabled: false, speed: 0.2 },
};
const clamp = (value: number, min = 0, max = 1) =>
  Math.max(min, Math.min(max, value));

type VisibilityUniforms = {
  uVisibility: THREE.IUniform<number>;
  uLoadingVisibility: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uMudNormal: THREE.IUniform<THREE.Texture>;
};
type SceneAsset = {
  key: string;
  loadedAt: number;
  lastFrame?: number;
  loopTimes?: Map<string, number>;
  group: THREE.Group;
  mixer?: THREE.AnimationMixer;
  actions: Map<string, THREE.AnimationAction>;
  uniforms: VisibilityUniforms[];
  materials: THREE.Material[];
  video?: HTMLVideoElement;
  videoTexture?: THREE.VideoTexture;
};
type SceneLayer = {
  index: number;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  cameraMotion: ReturnType<typeof cameraMotion>;
  timeline: Timeline;
  assets: SceneAsset[];
  particles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  lights: THREE.PointLight[];
  customCamera?: THREE.PerspectiveCamera;
  fallback: boolean;
  extras?: Extras;
};
export type Stage = {
  frame(
    scroll: number,
    time: number,
    reducedMotion: boolean,
    skipIntro?: boolean,
  ): void;
  resize(width: number, height: number): void;
  pointer(x: number, y: number): void;
  dispose(): void;
};

function disposeGraph(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    if (!mesh.material) return;
    for (const material of Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

function applyVisibility(material: THREE.Material, mud: THREE.Texture) {
  const uniforms: VisibilityUniforms = {
    uVisibility: { value: 1 },
    uLoadingVisibility: { value: 1 },
    uTime: { value: 0 },
    uMudNormal: { value: mud },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader =
      `varying vec3 vRenaissanceWorld;\n${shader.vertexShader}`.replace(
        "#include <project_vertex>",
        "vRenaissanceWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>",
      );
    shader.fragmentShader =
      `varying vec3 vRenaissanceWorld;\nuniform float uVisibility;\nuniform float uLoadingVisibility;\nuniform float uTime;\nuniform sampler2D uMudNormal;\n${visibilityNoise}\n${shader.fragmentShader}`.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>\n${visibilityFragment}`,
      );
  };
  material.customProgramCacheKey = () => "renaissance-visibility-v1";
  return uniforms;
}

const particleDefaults = {
  enabled: false,
  count: 100,
  size: 0.1,
  sizeVariation: 0,
  blur: 0.5,
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 0.6,
  speed: 0.5,
  turbulence: 0.2,
  blink: { speed: 0, min: 0.3 },
  scale: vector(10, 10, 10),
  position: vector(0, 0, -5),
};

function createParticles() {
  const count = 1000;
  let seed = 240126;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(count * 3),
    velocities = new Float32Array(count * 3);
  const phases = new Float32Array(count),
    sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions.set(
      [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1],
      i * 3,
    );
    velocities.set(
      [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1],
      i * 3,
    );
    phases[i] = random() * Math.PI * 2;
    sizes[i] = 0.5 + random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("velocity", new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("sizeScale", new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uSize: { value: 0.1 },
      uSizeVariation: { value: 0 },
      uColor: { value: new THREE.Color() },
      uOpacity: { value: 0.6 },
      uBlur: { value: 0.5 },
      uTime: { value: 0 },
      uSpeed: { value: 0.5 },
      uTurbulence: { value: 0.2 },
      uBlinkSpeed: { value: 0 },
      uBlinkMin: { value: 0.3 },
      tNoise: { value: createNoiseTexture() },
    },
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  return particles;
}

function modelAsset(gltf: GLTF, key: string, mud: THREE.Texture): SceneAsset {
  const group = new THREE.Group();
  group.name = `renaissance-${key}`;
  group.add(gltf.scene);
  const uniforms: VisibilityUniforms[] = [],
    materials: THREE.Material[] = [];
  const converted = new Map<THREE.Material, THREE.Material>();
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const convert = (source: THREE.Material) => {
      if (converted.has(source)) return converted.get(source)!;
      const original = source as THREE.MeshStandardMaterial;
      const material =
        !original.isMeshStandardMaterial || original.emissiveMap
          ? new THREE.MeshBasicMaterial({
              map: original.emissiveMap ?? original.map,
              opacity: original.opacity,
              transparent: original.transparent,
              alphaTest: original.alphaTest,
              side: original.side,
            })
          : original.clone();
      materials.push(material);
      uniforms.push(applyVisibility(material, mud));
      converted.set(source, material);
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(convert)
      : convert(mesh.material);
  });
  converted.forEach((_, original) => original.dispose());
  const mixer = new THREE.AnimationMixer(gltf.scene),
    actions = new Map<string, THREE.AnimationAction>();
  for (const clip of gltf.animations) {
    const action = mixer.clipAction(clip);
    action.play();
    action.timeScale = 0;
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    actions.set(animationKey(clip.name), action);
  }
  return {
    key,
    loadedAt: performance.now() / 1000,
    group,
    mixer,
    actions,
    uniforms,
    materials,
  };
}
function textureAsset(
  texture: THREE.Texture,
  key: string,
  mud: THREE.Texture,
): SceneAsset {
  const group = new THREE.Group(),
    material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  const dimensions = texture.image as { width: number; height: number };
  plane.scale.y = dimensions.height / dimensions.width;
  group.add(plane);
  return {
    key,
    loadedAt: performance.now() / 1000,
    group,
    actions: new Map(),
    uniforms: [applyVisibility(material, mud)],
    materials: [material],
  };
}
function disposeLayer(layer: SceneLayer) {
  for (const asset of layer.assets) {
    asset.mixer?.stopAllAction();
    if (asset.mixer) asset.mixer.uncacheRoot(asset.mixer.getRoot());
    asset.video?.pause();
    asset.video?.removeAttribute("src");
    asset.video?.load();
    asset.videoTexture?.dispose();
  }
  layer.extras?.dispose();
  disposeGraph(layer.scene);
  layer.particles.material.uniforms.tNoise.value.dispose();
}
function applyTransform(
  object: THREE.Object3D,
  state: Transform,
  aspect: number,
) {
  const multiplier = state.responsive === "cover" ? Math.max(1, aspect) : 1;
  object.position.set(
    state.position.x * multiplier,
    state.position.y * multiplier,
    state.position.z,
  );
  object.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
  object.scale.set(
    state.scale.x * multiplier,
    state.scale.y * multiplier,
    state.scale.z * multiplier,
  );
}

function updateLayer(
  layer: SceneLayer,
  position: number,
  elapsed: number,
  aspect: number,
  mouse: THREE.Vector2,
  reducedMotion: boolean,
  keyOverride: number | null = null,
  globeDragging = false,
  globeVelocity = 0,
) {
  if (layer.fallback) {
    const plane = layer.assets[0].group;
    const image = (layer.assets[0].materials[0] as THREE.MeshBasicMaterial).map!
      .image as { width: number; height: number };
    const imageAspect = image.width / image.height;
    layer.camera.position.set(0, 0, 4);
    layer.camera.lookAt(0, 0, 0);
    layer.camera.fov = 25;
    layer.camera.aspect = aspect;
    layer.camera.updateProjectionMatrix();
    const h = 8 * Math.tan((25 * Math.PI) / 360);
    const scale = Math.max((h * aspect) / 2, (h * imageAspect) / 2);
    plane.scale.setScalar(scale);
    return;
  }
  for (const asset of layer.assets) {
    const state = layer.timeline.sample(asset.key, position, transformDefaults);
    applyTransform(asset.group, state, aspect);
    for (const [name, action] of asset.actions) {
      const animation = state.animations[name],
        duration = action.getClip().duration;
      if (keyOverride !== null) {
        action.time = keyOverride * duration;
        continue;
      }
      asset.loopTimes ??= new Map();
      if (animation?.loop && !reducedMotion) {
        const time =
          (asset.loopTimes.get(name) ?? 0) +
          Math.min(0.05, Math.max(0, elapsed - (asset.lastFrame ?? elapsed)));
        asset.loopTimes.set(name, time);
        action.time = time % duration;
      } else {
        asset.loopTimes.delete(name);
        action.time = clamp(animation?.progress ?? 0) * duration;
      }
    }
    asset.lastFrame = elapsed;
    asset.mixer?.update(0);

    for (const material of asset.materials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.roughness = state.roughness;
        material.metalness = state.metalness;
      }
    }
    for (const u of asset.uniforms) {
      u.uTime.value = reducedMotion ? 0 : elapsed;
      u.uVisibility.value = state.visibility;
      u.uLoadingVisibility.value = reducedMotion
        ? 1
        : 1 -
          (1 - clamp((performance.now() / 1000 - asset.loadedAt) / 0.4)) ** 2;
    }
    if (
      asset.video &&
      Number.isFinite(asset.video.duration) &&
      !asset.video.seeking
    ) {
      const t =
        state.frame >= 0
          ? state.frame / 30
          : clamp(state.frameProgress) *
            Math.max(0, asset.video.duration - 1 / 30);
      if (Math.abs(asset.video.currentTime - t) > 1 / 35)
        asset.video.currentTime = t;
    }
  }
  const cameraState = layer.timeline.sample("camera", position, cameraDefaults);
  if (layer.customCamera) layer.scene.updateMatrixWorld(true);
  updateCamera(
    layer.camera,
    cameraState,
    layer.cameraMotion,
    reducedMotion ? new THREE.Vector2() : mouse,
    aspect,
    layer.customCamera,
    undefined,
    globeDragging,
    globeVelocity,
  );
  layer.lights.forEach((light, index) => {
    const value = layer.timeline.sample(`light-${index + 1}`, position, {
      position: vector(),
      color: { r: 1, g: 1, b: 1 },
      intensity: 0,
      distance: 0,
      decay: 2,
      display: false,
    });
    light.position.set(value.position.x, value.position.y, value.position.z);
    light.color.setRGB(value.color.r, value.color.g, value.color.b);
    light.intensity = value.intensity;
    light.distance = value.distance;
    light.decay = value.decay;
    const bulb = light.children[0] as THREE.Mesh;
    bulb.visible = value.display;
    (bulb.material as THREE.MeshBasicMaterial).color
      .copy(light.color)
      .multiplyScalar(value.intensity);
  });
  const particles = layer.timeline.sample(
    "particles",
    position,
    particleDefaults,
  );
  layer.particles.visible = particles.enabled;
  layer.particles.position.set(
    particles.position.x,
    particles.position.y,
    particles.position.z || -5,
  );
  layer.particles.scale.set(
    particles.scale.x || 10,
    particles.scale.y || 10,
    particles.scale.z || 10,
  );
  layer.particles.geometry.setDrawRange(0, Math.floor(particles.count));
  const uniforms = layer.particles.material.uniforms;
  uniforms.uTime.value = reducedMotion ? 0 : elapsed;
  uniforms.uColor.value.setRGB(
    particles.color.r,
    particles.color.g,
    particles.color.b,
  );
  uniforms.uSize.value = particles.size;
  uniforms.uSizeVariation.value = particles.sizeVariation;
  uniforms.uOpacity.value = particles.opacity;
  uniforms.uBlur.value = particles.blur;
  uniforms.uSpeed.value = particles.speed;
  uniforms.uTurbulence.value = particles.turbulence;
  uniforms.uBlinkSpeed.value = particles.blink.speed;
  uniforms.uBlinkMin.value = particles.blink.min;
}

export async function createStage(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<Stage> {
  const renderStartedAt = performance.now() / 1000;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x050608, 1);
  const manager = new THREE.LoadingManager(),
    draco = new DRACOLoader(manager).setDecoderPath(assets.draco);
  const ktx = new KTX2Loader(manager)
    .setTranscoderPath(assets.basis)
    .detectSupport(renderer);
  const gltfLoader = new GLTFLoader(manager)
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx);
  const json = async (url: string) => {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Scene data: ${response.status} ${url}`);
    return response.json();
  };
  let heroIntroStartedAt = Infinity;
  let introTimer: ReturnType<typeof setTimeout> | undefined;
  // The original camera starts as soon as Theatre is ready, independently of textures.
  const startup = await Promise.allSettled([
    json(sceneManifest[0].timeline).then((data: TimelineData) => {
      if (!signal.aborted)
        introTimer = setTimeout(() => {
          heroIntroStartedAt = performance.now() / 1000;
        }, 100);
      return data;
    }),
    ktx.loadAsync(assets.environment),
    new THREE.TextureLoader(manager).loadAsync(assets.mud),
  ]);
  const [heroResult, environmentResult, mudResult] = startup;
  if (
    heroResult.status === "rejected" ||
    environmentResult.status === "rejected" ||
    mudResult.status === "rejected" ||
    signal.aborted
  ) {
    clearTimeout(introTimer);
    if (environmentResult.status === "fulfilled")
      environmentResult.value.dispose();
    if (mudResult.status === "fulfilled") mudResult.value.dispose();
    draco.dispose();
    ktx.dispose();
    renderer.dispose();
    const failure = startup.find((result) => result.status === "rejected");
    throw failure?.reason || new DOMException("Scene disposed", "AbortError");
  }
  const heroData = heroResult.value,
    environment = environmentResult.value,
    mud = mudResult.value;
  environment.mapping = THREE.CubeUVReflectionMapping;
  mud.wrapS = mud.wrapT = THREE.RepeatWrapping;
  const layers = new Map<number, SceneLayer>(),
    pending = new Map<number, Promise<SceneLayer | undefined>>();
  let width = innerWidth,
    height = innerHeight,
    disposed = false,
    active = 0,
    visibleIndex = 0;
  const fallbackMode = matchMedia("(pointer: coarse)").matches;
  async function loadLayer(index: number): Promise<SceneLayer | undefined> {
    if (index < 0 || index >= sceneManifest.length || disposed) return;
    if (layers.has(index)) return layers.get(index);
    if (pending.has(index)) return pending.get(index);
    const job = (async () => {
      const config = sceneManifest[index],
        scene = new THREE.Scene();
      scene.environment = environment;
      const data =
        index === 0
          ? heroData
          : ((await json(config.timeline)) as TimelineData);
      const layer: SceneLayer = {
        index,
        scene,
        camera: new THREE.PerspectiveCamera(25, 1, 0.1, 2000),
        cameraMotion: cameraMotion(),
        timeline: new Timeline(data),
        assets: [],
        particles: createParticles(),
        lights: [],
        fallback: fallbackMode,
      };
      try {
        if (!fallbackMode) {
          const results = await Promise.allSettled(
            config.assets.map(async (source) => {
              if (source.type === "glb")
                return modelAsset(
                  await gltfLoader.loadAsync(source.url),
                  source.theatreKey,
                  mud,
                );
              if (source.type === "ktx2")
                return textureAsset(
                  await ktx.loadAsync(source.url),
                  source.theatreKey,
                  mud,
                );
              const cfg = source as typeof source & {
                config: { url: string; fallbackImage: string };
              };
              const asset = textureAsset(
                await ktx.loadAsync(cfg.config.fallbackImage),
                source.theatreKey,
                mud,
              );
              const video = document.createElement("video");
              video.muted = true;
              video.playsInline = true;
              video.preload = "auto";
              video.src = cfg.config.url;
              asset.video = video;
              video.addEventListener(
                "loadeddata",
                () => {
                  if (disposed || !video.src) return;
                  const texture = new THREE.VideoTexture(video);
                  texture.colorSpace = THREE.SRGBColorSpace;
                  asset.videoTexture = texture;
                  const material = asset
                    .materials[0] as THREE.MeshBasicMaterial;
                  material.map?.dispose();
                  material.map = texture;
                  material.needsUpdate = true;
                  (asset.group.children[0] as THREE.Mesh).scale.y =
                    -video.videoHeight / video.videoWidth;
                },
                { once: true },
              );
              video.load();
              return asset;
            }),
          );
          for (const result of results)
            if (result.status === "fulfilled") {
              layer.assets.push(result.value);
              scene.add(result.value.group);
            }
          const failure = results.find(
            (result) => result.status === "rejected",
          );
          if (failure) throw failure.reason;
          if (config.cameraName)
            scene.traverse((object) => {
              if (
                object.name === config.cameraName &&
                (object as THREE.PerspectiveCamera).isPerspectiveCamera
              )
                layer.customCamera = object as THREE.PerspectiveCamera;
            });
        } else {
          const fallback = (config.fallbacks.fallbackImageMobileOptimized ||
            config.fallbacks.fallbackImageOptimized) as { url: string };
          const asset = textureAsset(
            await ktx.loadAsync(fallback.url),
            "fallback",
            mud,
          );
          asset.uniforms.forEach((u) => (u.uVisibility.value = 1));
          layer.assets = [asset];
          scene.add(asset.group);
        }
        scene.add(layer.particles);
        for (let i = 0; i < 2; i++) {
          const light = new THREE.PointLight(0xffffff, 0);
          light.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(0.05, 12, 8),
              new THREE.MeshBasicMaterial({ color: 0xffffff }),
            ),
          );
          layer.lights.push(light);
          scene.add(light);
        }
        if (!fallbackMode && [5, 6, 7, 8, 11].includes(index))
          layer.extras = await createExtras(
            index,
            scene,
            layer.timeline,
            ktx,
            gltfLoader,
            signal,
          );
        if (disposed || Math.abs(index - active) > 2) {
          disposeLayer(layer);
          return;
        }
        layers.set(index, layer);
        return layer;
      } catch (error) {
        disposeLayer(layer);
        if (!signal.aborted)
          console.error(`Artwork ${config.handle} failed`, error);
        return;
      }
    })();
    pending.set(index, job);
    void job.then(
      () => pending.delete(index),
      () => pending.delete(index),
    );
    return job;
  }
  await loadLayer(0);
  if (!layers.has(0)) {
    disposed = true;
    clearTimeout(introTimer);
    environment.dispose();
    mud.dispose();
    draco.dispose();
    ktx.dispose();
    renderer.dispose();
    throw new Error("Hero could not initialize");
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 400));
  void loadLayer(1);
  const target = () =>
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
  const currentTarget = target(),
    nextTarget = target(),
    noise = createNoiseTexture(),
    mouse = new THREE.Vector2(),
    pointerTarget = new THREE.Vector2();
  const compositeScene = new THREE.Scene(),
    compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    tCurrent: { value: currentTarget.texture },
    tNext: { value: nextTarget.texture },
    tMudNormal: { value: mud },
    tNoise: { value: noise },
    uProgress: { value: 0 },
    uAspect: { value: 1 },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uIsHero: { value: 1 },
    uIsFallback: { value: fallbackMode ? 1 : 0 },
    uProjectionView: { value: new THREE.Matrix4() },
    uFadeCenterPoint: { value: new THREE.Vector3(-0.08, 0.79, -7.5) },
    uDarken: { value: 0 },
  };
  const vertexShader =
    "varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}";
  const compositeMaterial = new THREE.ShaderMaterial({
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
    uniforms,
    vertexShader,
    fragmentShader: transitionFragment,
  });
  compositeScene.add(
    new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial),
  );
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(compositeScene, compositeCamera));
  const overlay = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tMudNormal: { value: mud },
      tNoise: { value: noise },
      uPosition: { value: -1 },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0.862745, 0.862745, 0.815686) },
      uResolution: { value: new THREE.Vector2() },
    },
    vertexShader,
    fragmentShader: overlayFragment,
  });
  composer.addPass(overlay);
  const hatTarget = target();
  const hatPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      tHatMask: { value: null },
      tMudNormal: { value: mud },
      tNoise: { value: noise },
      uInvertedSobelActive: { value: 0 },
      uHatHover: { value: 0 },
      uModalAnimation: { value: 0 },
      uIsModalAnimating: { value: 0 },
      uInvertedSobelColor: {
        value: new THREE.Color(0.862745, 0.862745, 0.815686),
      },
      uInvertedSobelFadeCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2() },
      uTime: { value: 0 },
    },
    vertexShader,
    fragmentShader: hatFragment,
  });
  hatPass.uniforms.tHatMask.value = hatTarget.texture;
  composer.addPass(hatPass);
  let merchOpen = false;
  const merchEvent = (e: Event) => {
    merchOpen = (e as CustomEvent).detail;
    canvas.closest<HTMLElement>(".renaissance-experience")!.dataset.merch =
      String(merchOpen);
  };
  window.addEventListener("renaissance:merch", merchEvent);
  SMAAWeightsShader.defines.SMAA_MAX_SEARCH_STEPS = "16";
  composer.addPass(new SMAAPass());
  const bloom = new BloomPass();
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const defaults = {
    bloom: { intensity: 8 },
    darken: { intensity: 0 },
    overlay: {
      position: -1,
      mobilePosition: -1,
      color: { r: 0.862745, g: 0.862745, b: 0.815686 },
    },
    sectionTransition: { fadeCenter: { x: -0.08, y: 0.79, z: -7.5 } },
  };
  let bounds: { top: number; height: number }[] = [];
  const measure = () => {
    bounds = sceneManifest.map((s) => {
      const el = document.querySelector<HTMLElement>(`[data-artwork-scene="${s.handle}"]`);
      return {
        top: el ? el.getBoundingClientRect().top + window.scrollY : 0,
        height: el?.getBoundingClientRect().height || height,
      };
    });
  };
  const observer = new ResizeObserver(measure);
  const main = document.querySelector("main");
  if (main) observer.observe(main);
  measure();
  const sceneTime = (index: number, scroll: number) => {
    const bound = bounds[index],
      early = sceneManifest[index].earlyCrossfade;
    return (
      (clamp(
        (scroll - bound.top + height * (1 + early)) /
          (bound.height + height * (1 + early)),
      ) *
        (bound.height + height)) /
      height
    );
  };
  const raycaster = new THREE.Raycaster();
  let hover: THREE.Object3D | null = null,
    drag = false,
    dragX = 0,
    earthTurn = 0,
    velocity = 0,
    keyTurn = 0,
    keyHoverAt = -Infinity,
    prevElapsed = 0;
  const canInteract = (event: PointerEvent) =>
    !(event.target as Element)?.closest(
      "a,button,article,dialog,.edition-header,.edition-panel,.native-modal,.plusone-study",
    );
  const move = (event: PointerEvent) => {
    if (drag) {
      velocity = (event.clientX - dragX) * 0.005;
      earthTurn += velocity;
      dragX = event.clientX;
    }
    const layer = layers.get(visibleIndex);
    if (!layer || !canInteract(event)) {
      hover = null;
      document.body.style.cursor = "";
      return;
    }
    raycaster.setFromCamera(
      new THREE.Vector2(
        (event.clientX / width) * 2 - 1,
        1 - (event.clientY / height) * 2,
      ),
      layer.camera,
    );
    const previousHover = hover;
    const hits = raycaster.intersectObjects(layer.scene.children, true);
    hover =
      hits
        .map((hit) => hit.object)
        .find((object) => /checkout-hat|earth|key/i.test(object.name)) || null;
    if (visibleIndex === 7) {
      const earth = layer.scene.getObjectByName("earth");
      if (earth) {
        const sphere = new THREE.Box3()
          .setFromObject(earth)
          .getBoundingSphere(new THREE.Sphere());
        sphere.radius *= 0.7;
        if (raycaster.ray.intersectsSphere(sphere)) hover = earth;
      }
    }
    if (visibleIndex === 11 && hover && !previousHover)
      keyHoverAt = performance.now() / 1000;
    canvas.dataset.hover = hover?.name || "";
    document.body.style.cursor = hover
      ? visibleIndex === 7
        ? "grab"
        : "pointer"
      : "";
  };
  const down = (event: PointerEvent) => {
    if (visibleIndex === 7 && hover && canInteract(event)) {
      drag = true;
      canvas.dataset.dragging = "true";
      dragX = event.clientX;
      document.body.style.cursor = "grabbing";
    }
  };
  const up = () => {
    drag = false;
    canvas.dataset.dragging = "false";
  };
  const click = (event: PointerEvent) => {
    if (!hover || !canInteract(event)) return;
    if (visibleIndex === 6 || visibleIndex === 11)
      window.dispatchEvent(
        new CustomEvent("renaissance:artwork", {
          detail: {
            type: visibleIndex === 6 ? "merch" : "key",
            id: "",
            x: event.screenX,
            y: event.screenY,
          },
        }),
      );
  };
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", down);
  window.addEventListener("pointerup", up);
  window.addEventListener("click", click);
  const keySender = createKeySender(canvas);
  let keyProgress = 0,
    keyTarget = 0;
  const insertKey = () => {
    keyTarget = 1;
  };
  const resetKey = () => {
    keyTarget = 0;
  };
  window.addEventListener("renaissance:key-insert", insertKey);
  window.addEventListener("renaissance:key-reset", resetKey);
  const stage: Stage = {
    resize(w, h) {
      width = w;
      height = h;
      const dpr = Math.max(
        1,
        Math.min(devicePixelRatio, 2, 3840 / w, 3840 / h),
      );
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      currentTarget.setSize(w * dpr, h * dpr);
      nextTarget.setSize(w * dpr, h * dpr);
      hatTarget.setSize(w * dpr, h * dpr);
      hatPass.uniforms.uResolution.value.set(w * dpr, h * dpr);
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      uniforms.uAspect.value = w / h;
      uniforms.uResolution.value.set(w * dpr, h * dpr);
      overlay.uniforms.uResolution.value.set(w * dpr, h * dpr);
      measure();
    },
    pointer(x, y) {
      pointerTarget.set(x, y);
    },
    frame(scroll, now, reducedMotion, skipIntro = false) {
      const elapsed = now - renderStartedAt;
      if (disposed || !bounds.length) return;
      const dt = Math.min(0.05, elapsed - prevElapsed);
      prevElapsed = elapsed;
      const found = bounds.findIndex(
        (bound) => scroll < Math.floor(bound.top + bound.height),
      );
      active = found < 0 ? 12 : found;
      for (const index of [active, active + 1, active - 1])
        void loadLayer(index);
      for (const [index, layer] of layers)
        if (Math.abs(index - active) > 1) {
          disposeLayer(layer);
          layers.delete(index);
        }
      const current = layers.get(active),
        next = layers.get(active + 1);
      if (!current) {
        canvas.dataset.loadingScene = sceneManifest[active].handle;
        return;
      }
      delete canvas.dataset.loadingScene;
      const intro =
        reducedMotion || skipIntro
          ? 1
          : 1 - (1 - clamp((now - heroIntroStartedAt) / 5)) ** 3;
      const currentTime =
          sceneTime(active, scroll) + (active === 0 ? intro - 1 : 0),
        nextTime = next ? sceneTime(active + 1, scroll) : 0;
      const transition = next ? clamp(nextTime) : 0;
      visibleIndex = transition >= 0.5 ? active + 1 : active;
      mouse.lerp(pointerTarget, 0.1);
      keyProgress +=
        (keyTarget - keyProgress) * (keyTarget > keyProgress ? 0.08 : 0.04);
      if (Math.abs(keyTarget - keyProgress) < 0.001) keyProgress = keyTarget;
      const keyOverride = keyProgress > 0 ? keyProgress : null;
      canvas.dataset.keyProgress = keyProgress.toFixed(3);
      canvas.dataset.coins = String(layers.get(11)?.scene.userData.coins || 0);
      updateLayer(
        current,
        currentTime,
        elapsed,
        width / height,
        pointerTarget,
        reducedMotion,
        keyOverride,
        drag,
        velocity,
      );
      if (next && transition > 0)
        updateLayer(
          next,
          nextTime,
          elapsed,
          width / height,
          pointerTarget,
          reducedMotion,
          keyOverride,
          drag,
          velocity,
        );
      if (!drag) {
        earthTurn += velocity;
        velocity *= 0.95;
        earthTurn *= 0.995;
      }
      if (visibleIndex === 7) {
        const earth = layers.get(7)?.scene.getObjectByName("earth");
        if (earth) earth.rotation.y += earthTurn;
      }
      if (visibleIndex === 11) {
        const progress = clamp((now - keyHoverAt) / 0.6);
        const eased =
          progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        keyTurn = progress < 1 ? eased * Math.PI * 2 : 0;
      }
      current.extras?.update(
        currentTime,
        elapsed,
        !!hover,
        keyTurn,
        reducedMotion,
      );
      if (next) next.extras?.update(nextTime, elapsed, false, 0, reducedMotion);
      const effect = current.timeline.sample("effects", currentTime, defaults);
      uniforms.uProgress.value = transition;
      uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      uniforms.uIsHero.value = active === 0 ? 1 : 0;
      uniforms.uDarken.value = effect.darken.intensity;
      uniforms.uMouse.value.set(mouse.x * 0.5 + 0.5, -mouse.y * 0.5 + 0.5);
      uniforms.uProjectionView.value.multiplyMatrices(
        current.camera.projectionMatrix,
        current.camera.matrixWorldInverse,
      );
      const center = effect.sectionTransition.fadeCenter;
      uniforms.uFadeCenterPoint.value.set(center.x, center.y, center.z);
      const hatLayer =
        active === 6
          ? current
          : active === 5 && transition > 0
            ? next
            : undefined;
      const hat = hatLayer?.scene.getObjectByName("checkout-hat");
      hatPass.uniforms.uInvertedSobelActive.value = hat ? 1 : 0;
      hatPass.uniforms.uHatHover.value = THREE.MathUtils.lerp(
        hatPass.uniforms.uHatHover.value,
        hover && active === 6 ? 1 : 0,
        0.12,
      );
      hatPass.uniforms.uModalAnimation.value = THREE.MathUtils.lerp(
        hatPass.uniforms.uModalAnimation.value,
        merchOpen ? 1.5 : 0,
        0.06,
      );
      hatPass.uniforms.uIsModalAnimating.value =
        hatPass.uniforms.uModalAnimation.value > 0.001 ? 1 : 0;
      hatPass.uniforms.uTime.value = elapsed;
      if (hat && hatLayer) {
        hat.layers.enable(1);
        hatLayer.camera.layers.set(1);
        renderer.setClearColor(0, 0);
        renderer.setRenderTarget(hatTarget);
        renderer.clear();
        renderer.render(hatLayer.scene, hatLayer.camera);
        hatLayer.camera.layers.set(0);
        renderer.setClearColor(0x050608, 1);
      }
      if (transition < 1) {
        renderer.setRenderTarget(currentTarget);
        renderer.render(current.scene, current.camera);
      }
      if (next && transition > 0) {
        renderer.setRenderTarget(nextTarget);
        renderer.render(next.scene, next.camera);
      }
      renderer.setRenderTarget(null);
      const paper =
        width < 768 ? effect.overlay.mobilePosition : effect.overlay.position;
      overlay.uniforms.uPosition.value =
        paper > -1 ? paper + (1 - paper) * transition : -1;
      overlay.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
      overlay.uniforms.uColor.value.setRGB(
        effect.overlay.color.r,
        effect.overlay.color.g,
        effect.overlay.color.b,
      );
      bloom.strength = effect.bloom.intensity;
      composer.render();
      const rect = canvas.getBoundingClientRect();
      keySender.frame({
        canvas: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        window: {
          x: screenX,
          y: screenY,
          w: innerWidth,
          h: innerHeight,
          scroll,
        },
        section: {
          handle: sceneManifest[active].handle,
          index: active,
          nextHandle: sceneManifest[active + 1]?.handle,
          transitionProgress: transition,
          theatreTime: currentTime,
          totalProgress:
            scroll /
            Math.max(1, document.documentElement.scrollHeight - height),
        },
      });
      canvas.dataset.scene =
        sceneManifest[transition >= 1 ? active + 1 : active].handle;
      canvas.dataset.progress = transition.toFixed(3);
      canvas.dataset.intro = intro > 0.9999 ? "complete" : "playing";
      canvas.dataset.resident = String(layers.size);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(introTimer);
      keySender.dispose();
      window.removeEventListener("renaissance:key-insert", insertKey);
      window.removeEventListener("renaissance:key-reset", resetKey);
      observer.disconnect();
      window.removeEventListener("renaissance:merch", merchEvent);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("click", click);
      document.body.style.cursor = "";
      layers.forEach(disposeLayer);
      layers.clear();
      disposeGraph(compositeScene);
      currentTarget.dispose();
      nextTarget.dispose();
      hatTarget.dispose();
      composer.passes.forEach((pass) => pass.dispose());
      composer.dispose();
      environment.dispose();
      mud.dispose();
      noise.dispose();
      draco.dispose();
      ktx.dispose();
      renderer.dispose();
    },
  };
  if (signal.aborted) {
    stage.dispose();
    throw new DOMException("Scene disposed", "AbortError");
  }
  return stage;
}
