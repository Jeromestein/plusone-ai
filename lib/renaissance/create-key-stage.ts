import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import config from "./data/key-popup.json";
import { assets } from "./assets";
import { createKeyReceiver, type KeyState } from "./key-transport";
import { createKeyAmbient } from "./key-ambient";

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const backOut = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
const gold = 0xbf9752;
const models = config.modelsBySection as Record<
  string,
  typeof config.modelsBySection.shipping
>;
const shaders = config.shaderSourceByName as Record<string, string>;
type Prop = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  materials: THREE.MeshStandardMaterial[];
  visibility: THREE.IUniform<number>[];
};

/** A live, aligned view into the main canvas, with independently rendered props. */
export function createKeyStage(
  canvas: HTMLCanvasElement,
  session: string,
  onReady: () => void,
  onError: (error: unknown) => void,
) {
  let disposed = false,
    frame = 0,
    state: KeyState | undefined,
    videoReady = false,
    announced = false;
  let currentHandle = "",
    requestedHandle = "",
    current: Prop | undefined,
    modelStarted = performance.now();
  let pickedUp = true,
    inserted = false,
    insertAt = 0,
    visibility = 1,
    holeScale = 0;
  let holeShown = false,
    holeScaleFrom = 0,
    holeScaleAt = 0;
  let clickSpin = 0,
    targetSpin = 0,
    scrollRotation = 0,
    smoothScroll = 0,
    lastScroll = 0;
  let planeX = 0,
    planeY = 0,
    planeW = 8,
    planeH = 5,
    offsetX = 0,
    offsetY = 0,
    positionSpeed = 0.2;
  let velocityX = 0,
    velocityY = 0,
    previousX = screenX,
    previousY = screenY,
    lastTime = performance.now();
  let pointerDown:
    | { x: number; y: number; moved: boolean; model: boolean }
    | undefined;
  const pending = new Set<Promise<unknown>>(),
    cached = new Map<string, Prop>();
  const receiver = createKeyReceiver(
    session,
    (value) => {
      state = value;
    },
    (video) => {
      if (disposed) return;
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      videoTexture = texture;
      planeMaterial.uniforms.uTexture.value = texture;
      videoReady = true;
    },
    onError,
  );
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5;
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(2, 3, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  Object.assign(light.shadow.camera, {
    left: -10,
    right: 10,
    top: 10,
    bottom: -10,
    near: 0.1,
    far: 20,
  });
  light.shadow.radius = 2;
  light.shadow.bias = -0.0001;
  scene.add(light);
  const draco = new DRACOLoader().setDecoderPath(assets.draco);
  const ktx = new KTX2Loader()
    .setTranscoderPath(assets.basis)
    .detectSupport(renderer);
  const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx);
  let videoTexture: THREE.VideoTexture | undefined,
    environment: THREE.WebGLRenderTarget | undefined;
  const ownedTextures = new Set<THREE.Texture>();
  const track = <T>(job: Promise<T>) => {
    pending.add(job);
    void job.finally(() => pending.delete(job)).catch(() => {});
    return job;
  };
  const disposeGraph = (root: THREE.Object3D) => {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material)
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture && value !== videoTexture)
              ownedTextures.add(value);
          material.dispose();
        }
    });
  };
  function discard(material: THREE.MeshStandardMaterial) {
    const uniform = { value: 1 };
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uVisibility = uniform;
      shader.vertexShader =
        `varying vec3 vWorldPosition;\n${shader.vertexShader}`.replace(
          "#include <project_vertex>",
          "vWorldPosition=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>",
        );
      shader.fragmentShader =
        `varying vec3 vWorldPosition;uniform float uVisibility;\n${config.discardShader.noise}\n${shader.fragmentShader}`.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>\n${config.discardShader.fragment}`,
        );
    };
    material.customProgramCacheKey = () => "key-discard-v1";
    return uniform;
  }
  async function loadProp(handle: string): Promise<Prop | undefined> {
    if (cached.has(handle)) return cached.get(handle);
    const definition = models[handle];
    if (!definition) return;
    const gltf = await loader.loadAsync(definition.localUrl);
    if (disposed) {
      disposeGraph(gltf.scene);
      return;
    }
    const model = gltf.scene,
      materials: THREE.MeshStandardMaterial[] = [],
      visibility: THREE.IUniform<number>[] = [];
    model.traverse((object) => {
      if (!(object as THREE.Mesh).isMesh) return;
      const mesh = object as THREE.Mesh;
      const convert = (source: THREE.Material) => {
        const material =
          source instanceof THREE.MeshStandardMaterial
            ? source
            : new THREE.MeshStandardMaterial();
        material.color.setHex(gold);
        material.metalness = 1;
        material.roughness = 0.2;
        material.envMapIntensity = 2;
        materials.push(material);
        visibility.push(discard(material));
        return material;
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(convert)
        : convert(mesh.material);
      mesh.castShadow = mesh.receiveShadow = true;
    });
    model.scale.setScalar(definition.scale);
    model.updateMatrixWorld(true);
    model.position.copy(
      new THREE.Box3()
        .setFromObject(model)
        .getCenter(new THREE.Vector3())
        .negate(),
    );
    const root = new THREE.Group();
    root.add(model);
    root.rotation.fromArray(definition.rotation as [number, number, number]);
    const mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
    const prop = { root, mixer, materials, visibility };
    cached.set(handle, prop);
    return prop;
  }
  const scrollGroup = new THREE.Group(),
    velocityGroup = new THREE.Group(),
    spinGroup = new THREE.Group();
  scene.add(scrollGroup);
  scrollGroup.add(velocityGroup);
  velocityGroup.add(spinGroup);
  scrollGroup.position.z = -2.5;
  const hitbox = new THREE.Mesh(
    new THREE.SphereGeometry(2, 8, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  spinGroup.add(hitbox);
  const hole = new THREE.Group();
  hole.position.z = -2.5;
  hole.visible = false;
  scene.add(hole);
  const holeMaterial = new THREE.MeshStandardMaterial({
    color: gold,
    metalness: 1,
    roughness: 0.2,
    envMapIntensity: 1,
  });
  const holeVisibility = discard(holeMaterial);
  track(
    loader.loadAsync(config.keyhole.localUrl).then((gltf) => {
      if (disposed) {
        disposeGraph(gltf.scene);
        return;
      }
      gltf.scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.material = holeMaterial;
        }
      });
      gltf.scene.scale.setScalar(1.4);
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.position
        .copy(
          new THREE.Box3()
            .setFromObject(gltf.scene)
            .getCenter(new THREE.Vector3())
            .negate(),
        )
        .add(new THREE.Vector3(-0.8, 0, -2));
      hole.add(gltf.scene);
    }),
  ).catch(onError);
  track(
    new RGBELoader()
      .loadAsync(config.scene.environment.localUrl)
      .then((texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }
        const generator = new THREE.PMREMGenerator(renderer);
        environment = generator.fromEquirectangular(texture);
        scene.environment = environment.texture;
        texture.dispose();
        generator.dispose();
      }),
  ).catch(onError);
  const planeMaterial = new THREE.ShaderMaterial({
    vertexShader: config.shaderVertexSource,
    fragmentShader: shaders.default,
    uniforms: {
      uTexture: { value: null },
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uScanActive: { value: 0 },
      uVelocity: { value: new THREE.Vector2() },
      uPosition: { value: new THREE.Vector2() },
      uMudNormal: { value: null },
    },
  });
  const plane = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), planeMaterial);
  scene.add(plane);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShadowMaterial({ opacity: 0.8 }),
  );
  shadow.receiveShadow = true;
  scene.add(shadow);
  const graffitiMaterial = new THREE.ShaderMaterial({
    vertexShader: config.shaderVertexSource,
    fragmentShader: config.graffiti.fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTexture: { value: null },
      uMudNormal: { value: null },
      uTime: { value: 0 },
      uVisibility: { value: 0 },
      uTransition: { value: 0 },
      uScrollOffset: { value: 0 },
      uPlaneAspect: { value: 1 },
    },
  });
  const graffiti = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    graffitiMaterial,
  );
  scene.add(graffiti);
  track(
    ktx.loadAsync(config.graffiti.texture.localUrl).then((texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      ownedTextures.add(texture);
      graffitiMaterial.uniforms.uTexture.value = texture;
    }),
  ).catch(onError);
  track(
    new THREE.TextureLoader().loadAsync(assets.mud).then((texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      ownedTextures.add(texture);
      planeMaterial.uniforms.uMudNormal.value = texture;
      graffitiMaterial.uniforms.uMudNormal.value = texture;
    }),
  ).catch(onError);
  let shoppy: THREE.Group | undefined,
    shoppyMixer: THREE.AnimationMixer | undefined;
  track(
    loader.loadAsync(config.shoppy.model.localUrl).then((gltf) => {
      if (disposed) {
        disposeGraph(gltf.scene);
        return;
      }
      shoppy = gltf.scene;
      shoppy.scale.setScalar(2.5);
      scene.add(shoppy);
      shoppyMixer = new THREE.AnimationMixer(shoppy);
      if (gltf.animations[0]) shoppyMixer.clipAction(gltf.animations[0]).play();
    }),
  ).catch(onError);
  const ambient = createKeyAmbient(scene);
  const ambientPosition = new THREE.Vector3(),
    ambientQuaternion = new THREE.Quaternion();
  let ambientX = 0,
    ambientY = 0;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.4, 0.95),
  );
  composer.addPass(new OutputPass());
  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio, 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);
    planeMaterial.uniforms.uResolution.value.set(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const ray = new THREE.Raycaster();
  const hit = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      ),
      camera,
    );
    return !!current && !inserted && ray.intersectObject(hitbox).length > 0;
  };
  const down = (event: PointerEvent) => {
    pointerDown = {
      x: event.screenX,
      y: event.screenY,
      moved: false,
      model: hit(event),
    };
    canvas.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    canvas.style.cursor = hit(event) ? "pointer" : "move";
    if (pointerDown && !pointerDown.model) {
      const dx = event.screenX - pointerDown.x,
        dy = event.screenY - pointerDown.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pointerDown.moved = true;
      if (window.opener) window.moveTo(screenX + dx, screenY + dy);
      pointerDown.x = event.screenX;
      pointerDown.y = event.screenY;
    }
  };
  const up = (event: PointerEvent) => {
    if (pointerDown?.model && !pointerDown.moved && hit(event)) {
      targetSpin += Math.PI;
      pickedUp = !pickedUp;
      if (!pickedUp) {
        offsetX = scrollGroup.position.x - planeX;
        offsetY = scrollGroup.position.y - planeY;
      }
      planeMaterial.fragmentShader = pickedUp
        ? shaders[requestedHandle] || shaders.default
        : shaders.blacklight;
      planeMaterial.needsUpdate = true;
    }
    pointerDown = undefined;
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    receiver.send("wheel", event.deltaY);
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  const clockStart = performance.now();
  const animate = (now: number) => {
    if (disposed) return;
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000)),
      time = (now - clockStart) / 1000;
    lastTime = now;
    velocityX = velocityX * 0.7 + (screenX - previousX) * 0.3;
    velocityY = velocityY * 0.7 + (screenY - previousY) * 0.3;
    previousX = screenX;
    previousY = screenY;
    if (state) {
      const { canvas: mainCanvas, window: main, section } = state;
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      const visibleH = 2 * Math.tan(THREE.MathUtils.degToRad(25)) * 10,
        visibleW = (visibleH * width) / height;
      const targetX =
        ((main.x + mainCanvas.x + mainCanvas.w / 2 - screenX - width / 2) /
          width) *
        visibleW;
      const targetY =
        (-(main.y + mainCanvas.y + mainCanvas.h / 2 - screenY - height / 2) /
          height) *
          visibleH -
        0.5;
      planeX += (targetX - planeX) * 0.25;
      planeY += (targetY - planeY) * 0.25;
      planeW = (visibleW * mainCanvas.w) / width;
      planeH = (visibleH * mainCanvas.h) / height;
      plane.position.set(planeX, planeY, -5 - planeW * 0.1);
      plane.scale.set(planeW, planeH, planeW * 2);
      shadow.position.set(planeX, planeY, -4);
      shadow.scale.set(planeW, planeH, 1);
      graffiti.position.set(planeX, planeY, -4.9);
      graffiti.scale.set(planeW, planeH, 1);
      if (shoppy) shoppy.position.set(planeX, planeY + planeH * 0.5, -6);
      hole.position.set(planeX, planeY, -2.5);
      const handle =
        section.nextHandle && section.transitionProgress >= 0.5
          ? section.nextHandle
          : section.handle;
      if (requestedHandle !== handle) {
        requestedHandle = handle;
        planeMaterial.fragmentShader = pickedUp
          ? shaders[handle] || shaders.default
          : shaders.blacklight;
        planeMaterial.needsUpdate = true;
        track(
          loadProp(handle).then((prop) => {
            if (!prop || disposed || requestedHandle !== handle) return;
            const wasVisible = !!current;
            if (current) spinGroup.remove(current.root);
            current = prop;
            currentHandle = handle;
            spinGroup.add(prop.root);
            modelStarted = wasVisible ? now - 800 : performance.now();
          }),
        ).catch(onError);
      }
      smoothScroll +=
        (THREE.MathUtils.clamp(main.scroll - lastScroll, -50, 50) -
          smoothScroll) *
        0.1;
      lastScroll = main.scroll;
      scrollRotation += smoothScroll * 0.002;
      scrollGroup.rotation.x += (scrollRotation - scrollGroup.rotation.x) * 0.1;
      const u = graffitiMaterial.uniforms;
      const shown = !pickedUp ? 1 : 0;
      u.uVisibility.value +=
        (shown - u.uVisibility.value) * (shown ? 0.05 : 0.08);
      u.uTransition.value = u.uVisibility.value * (1 - u.uVisibility.value) * 4;
      u.uTime.value = time;
      u.uScrollOffset.value +=
        (section.totalProgress * 2 - u.uScrollOffset.value) * 0.1;
      u.uPlaneAspect.value = planeW / planeH;
      graffiti.visible = !!u.uTexture.value;
      if (
        inserted &&
        now - insertAt > 2000 &&
        planeMaterial.fragmentShader !== shaders.blacklight
      ) {
        planeMaterial.fragmentShader = shaders.blacklight;
        planeMaterial.needsUpdate = true;
      }
    }
    if (current) {
      const scale = backOut(clamp((now - modelStarted) / 800));
      current.root.scale.setScalar(scale);
      current.mixer.update(dt);
      const tx = inserted ? planeX : pickedUp ? 0 : planeX + offsetX,
        ty = inserted ? planeY + 0.15 : pickedUp ? 0 : planeY + offsetY;
      positionSpeed += ((pickedUp ? 0.05 : 1) - positionSpeed) * 0.03;
      scrollGroup.position.x +=
        (tx - scrollGroup.position.x) * (pickedUp ? 0.05 : positionSpeed);
      scrollGroup.position.y +=
        (ty - scrollGroup.position.y) * (pickedUp ? 0.05 : positionSpeed);
      scrollGroup.position.z +=
        ((pickedUp ? 0 : inserted ? -2.4 : -2.5) - scrollGroup.position.z) *
        0.1;
      velocityGroup.rotation.x +=
        ((pickedUp ? velocityY * 0.007 : 0) - velocityGroup.rotation.x) * 0.1;
      velocityGroup.rotation.z +=
        ((pickedUp ? velocityX * 0.007 : 0) - velocityGroup.rotation.z) * 0.1;
      clickSpin += (targetSpin - clickSpin) * 0.025;
      if (!inserted)
        spinGroup.rotation.set(
          time * 0.168,
          time * 0.12 + clickSpin,
          time * 0.24,
        );
      else
        spinGroup.rotation.set(
          THREE.MathUtils.lerp(spinGroup.rotation.x, Math.PI * 0.65, 0.1),
          0,
          0,
        );
      const near =
        Math.hypot(
          scrollGroup.position.x - planeX,
          scrollGroup.position.y - planeY,
        ) < 2;
      if (
        currentHandle === "shipping" &&
        !pickedUp &&
        !inserted &&
        near &&
        hole.children.length
      ) {
        inserted = true;
        insertAt = now;
        receiver.send("insert");
      }
      const showHole = currentHandle === "shipping";
      if (showHole !== holeShown) {
        holeShown = showHole;
        holeScaleFrom = holeScale;
        holeScaleAt = now;
      }
      const holeProgress = clamp((now - holeScaleAt) / (holeShown ? 600 : 400));
      const holeEase = holeShown
        ? backOut(holeProgress)
        : 2.7 * holeProgress ** 3 - 1.7 * holeProgress ** 2;
      holeScale =
        holeScaleFrom + ((holeShown ? 1 : 0) - holeScaleFrom) * holeEase;
      hole.scale.setScalar(holeScale);
      visibility += ((inserted ? 0 : 1) - visibility) * 0.05;
      current.visibility.forEach((uniform) => (uniform.value = visibility));
      holeVisibility.value = visibility;
      current.materials.forEach(
        (material) =>
          (material.envMapIntensity +=
            ((inserted ? 0 : 2) - material.envMapIntensity) * 0.1),
      );
      holeMaterial.envMapIntensity +=
        ((inserted ? 0 : near && pickedUp ? 10 : 1) -
          holeMaterial.envMapIntensity) *
        0.15;
      hole.visible = holeScale > 0.001 && visibility > 0.01;
      scrollGroup.visible = visibility > 0.01;
      canvas.dataset.keyState = inserted
        ? "inserted"
        : pickedUp
          ? "picked-up"
          : "dropped";
      canvas.dataset.section = currentHandle;
      canvas.dataset.alignment = `${planeX.toFixed(2)},${planeY.toFixed(2)}`;
      if (videoReady && !announced) {
        announced = true;
        receiver.send("ready");
        onReady();
      }
    }
    spinGroup.getWorldPosition(ambientPosition);
    spinGroup.getWorldQuaternion(ambientQuaternion);
    ambient.update(
      time,
      {
        x: planeX,
        y: planeY,
        deltaX: planeX - ambientX,
        deltaY: planeY - ambientY,
      },
      {
        position: ambientPosition,
        quaternion: ambientQuaternion,
        pickedUp,
        visible: !!current && scrollGroup.visible,
        handle: currentHandle,
      },
    );
    ambientX = planeX;
    ambientY = planeY;
    planeMaterial.uniforms.uTime.value = time;
    planeMaterial.uniforms.uVelocity.value.lerp(
      new THREE.Vector2(velocityX, velocityY),
      0.1,
    );
    planeMaterial.uniforms.uPosition.value.lerp(
      new THREE.Vector2(screenX, screenY),
      0.1,
    );
    plane.visible = videoReady;
    shoppyMixer?.update(dt);
    composer.render();
    frame = requestAnimationFrame(animate);
  };
  frame = requestAnimationFrame(animate);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    receiver.dispose();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("wheel", wheel);
    window.removeEventListener("pagehide", dispose);
    ambient.dispose();
    for (const prop of cached.values()) {
      prop.mixer.stopAllAction();
      prop.root.removeFromParent();
      disposeGraph(prop.root);
    }
    disposeGraph(scene);
    ownedTextures.forEach((texture) => texture.dispose());
    videoTexture?.dispose();
    environment?.dispose();
    composer.passes.forEach((pass) => pass.dispose());
    composer.dispose();
    draco.dispose();
    ktx.dispose();
    renderer.dispose();
  };
  window.addEventListener("pagehide", dispose, { once: true });
  return { dispose };
}
