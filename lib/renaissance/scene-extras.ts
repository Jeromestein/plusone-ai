import * as THREE from "three";
import type { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import type { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Timeline } from "./timeline";
import {
  butterflyVertex,
  butterflyFragment,
  globeVertex,
  globeFragment,
} from "./scene-shaders";

const base = "/mirror/cdn.shopify.com/s/files/1/0951/3130/4218/files/";
const v = (x = 0, y = 0, z = 0) => ({ x, y, z });
export type Extras = {
  update(
    position: number,
    time: number,
    hover: boolean,
    turn: number,
    reduced: boolean,
  ): void;
  dispose(): void;
};
export async function createExtras(
  index: number,
  scene: THREE.Scene,
  timeline: Timeline,
  ktx: KTX2Loader,
  loader: GLTFLoader,
  signal: AbortSignal,
): Promise<Extras> {
  let butterfly:
    | THREE.InstancedMesh<THREE.BufferGeometry, THREE.ShaderMaterial>
    | undefined;
  let globe: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> | undefined;
  let key: THREE.Group | undefined;
  let coins: THREE.InstancedMesh | undefined,
    coinStart = -Infinity,
    lastCoinFrame = 0;
  let keyScale = 1,
    keyScaleFrom = 1,
    keyScaleTo = 1,
    keyScaleStarted = 0;
  const coinStates = Array.from({ length: 150 }, () => ({
    delay: Math.random() * 0.5,
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    rotation: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    scale: 0.075,
  }));
  const rain = () => {
    coinStart = performance.now() / 1000 + 0.5;
    lastCoinFrame = performance.now() / 1000;
    for (const coin of coinStates) {
      const angle = Math.random() * Math.PI * 2,
        radius = Math.random() * 0.2;
      coin.delay = Math.random() * 0.5;
      coin.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      coin.velocity.set(
        Math.random() - 0.5,
        1.2 + Math.random(),
        Math.random() - 0.5,
      );
      coin.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      coin.spin.set(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 2,
      );
      coin.scale = 0.075 * (0.8 + Math.random() * 0.4);
    }
  };
  const reset = () => {
    coinStart = -Infinity;
  };
  const keyVisibility = (event: Event) => {
    keyScaleFrom = keyScale;
    keyScaleTo = (event as CustomEvent<boolean>).detail ? 0 : 1;
    keyScaleStarted = performance.now() / 1000;
  };
  if (index === 11) {
    const coinModel = await loader.loadAsync(
      "/mirror/cdn.shopify.com/3d/models/362039553a5d18aa/coin-reduced.glb",
    );
    let geometry: THREE.BufferGeometry | undefined;
    coinModel.scene.traverse((object) => {
      if (!geometry && (object as THREE.Mesh).isMesh)
        geometry = (object as THREE.Mesh).geometry.clone();
    });
    coinModel.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material)
        (Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]
        ).forEach((material) => material.dispose());
    });
    if (geometry) {
      coins = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshStandardMaterial({
          color: 12556114,
          metalness: 1,
          roughness: 0.2,
          envMapIntensity: 6,
        }),
        150,
      );
      coins.position.set(-0.2, 0.5, 0);
      coins.visible = false;
      coins.frustumCulled = false;
      scene.add(coins);
    }
    window.addEventListener("renaissance:key-insert", rain);
    window.addEventListener("renaissance:key-reset", reset);
    window.addEventListener("renaissance:key-visibility", keyVisibility);
  }
  const earth = scene.getObjectByName("earth");
  const butterflyDefaults = {
    enabled: false,
    count: 6,
    scale: 0.06,
    speed: 1.5,
    movementSpeed: 1,
    boundaryRadius: 6,
    position: v(),
    color: { r: 1, g: 1, b: 1 },
    glowColor: { r: 1, g: 1, b: 1 },
    hue: 0,
    opacity: 1,
  };
  if ([5, 6, 8].includes(index)) {
    const [geometryData, map] = await Promise.all([
      fetch(base + "rest.json", { signal }).then((r) => r.json()),
      ktx.loadAsync(base + "butterfly2_256.ktx2"),
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(geometryData.position, 3),
    );
    geometry.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute(geometryData.uv, 2),
    );
    geometry.setIndex(geometryData.index);
    geometry.setAttribute(
      "instanceRandom",
      new THREE.InstancedBufferAttribute(
        new Float32Array(
          Array.from(
            { length: 48 },
            (_, i) => (Math.sin(i * 431.78) * 4783.34 + 4784) % 1,
          ),
        ),
        4,
      ),
    );
    const material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: {
        tMap: { value: map },
        uTime: { value: 0 },
        uSpeed: { value: 1 },
        uScale: { value: 0.06 },
        uColor: { value: new THREE.Color() },
        uGlowColor: { value: new THREE.Color() },
        uOpacity: { value: 1 },
        uHue: { value: 0 },
      },
      vertexShader: butterflyVertex,
      fragmentShader: butterflyFragment,
    });
    butterfly = new THREE.InstancedMesh(geometry, material, 12);
    butterfly.frustumCulled = false;
    scene.add(butterfly);
  }
  if (index === 7 && earth) {
    const map = await new THREE.TextureLoader().loadAsync(
      base + "equirectangular_map.webp",
    );
    globe = new THREE.Mesh(
      new THREE.SphereGeometry(51.3685 * 0.98, 64, 64),
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0.2, 0.5, 1) },
          uColorMap: { value: map },
          uOpacity: { value: 0.8 },
          uHueShift: { value: 0 },
          uHover: { value: 0 },
        },
        vertexShader: globeVertex,
        fragmentShader: globeFragment,
      }),
    );
    globe.renderOrder = 2;
    scene.add(globe);
  }
  if (index === 11) {
    key = scene.getObjectByName("renaissance-asset-3") as
      | THREE.Group
      | undefined;
    if (key) {
      const visual = new THREE.Group();
      visual.add(...key.children);
      key.add(visual);
      key = visual;
      key.name = "key";
      key.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const mesh = o as THREE.Mesh;
          mesh.name = "key-hit";
          mesh.material = new THREE.MeshStandardMaterial({
            color: 12556114,
            metalness: 1,
            roughness: 0.2,
            envMapIntensity: 4.5,
          });
        }
      });
    }
  }
  const dummy = new THREE.Object3D();
  return {
    update(position, time, hover, turn, reduced) {
      if (butterfly) {
        const state = timeline.sample(
          "butterflies",
          position,
          butterflyDefaults,
        );
        butterfly.visible = state.enabled;
        butterfly.count = Math.min(12, state.count);
        butterfly.position.set(
          state.position.x,
          state.position.y,
          state.position.z,
        );
        const u = butterfly.material.uniforms;
        u.uTime.value = reduced ? 0 : time;
        u.uSpeed.value = state.speed;
        u.uScale.value = state.scale;
        u.uHue.value = state.hue;
        u.uOpacity.value = state.opacity;
        u.uColor.value.setRGB(state.color.r, state.color.g, state.color.b);
        u.uGlowColor.value.setRGB(
          state.glowColor.r,
          state.glowColor.g,
          state.glowColor.b,
        );
        for (let i = 0; i < butterfly.count; i++) {
          const t =
            (reduced ? 0 : time) * state.movementSpeed * 0.2 + i * 2.399;
          dummy.position.set(
            Math.sin(t * 0.73 + i) * state.boundaryRadius * 0.55,
            Math.cos(t * 0.52 + i * 2) * state.boundaryRadius * 0.35,
            Math.sin(t * 0.37 + i) * 1.5,
          );
          dummy.rotation.set(
            Math.sin(t) * 0.4,
            t * 0.4,
            Math.cos(t * 0.7) * 0.35,
          );
          dummy.updateMatrix();
          butterfly.setMatrixAt(i, dummy.matrix);
        }
        butterfly.instanceMatrix.needsUpdate = true;
      }
      if (globe && earth) {
        const state = timeline.sample("globe", position, {
          scale: 1,
          position: v(),
          color: { r: 0.2, g: 0.5, b: 1 },
          opacity: 0.8,
        });
        earth.updateWorldMatrix(true, false);
        earth.getWorldPosition(globe.position);
        earth.getWorldQuaternion(globe.quaternion);
        earth.getWorldScale(globe.scale);
        globe.scale.multiplyScalar(1.1);
        globe.rotateY(Math.PI * 1.49);
        const u = globe.material.uniforms;
        u.uTime.value = reduced ? 0 : time;
        u.uOpacity.value = 0.8;
        u.uColor.value.setRGB(0.2, 0.5, 1);
        u.uHover.value = hover ? 1 : 0;
      }
      if (coins) {
        const now = performance.now() / 1000,
          age = now - coinStart;
        const dt = Math.max(0, Math.min(0.05, now - lastCoinFrame));
        lastCoinFrame = now;
        let alive = 0;
        for (let i = 0; i < coinStates.length; i++) {
          const coin = coinStates[i],
            started = age >= coin.delay;
          if (started && coin.position.y >= -3) {
            coin.velocity.y -= 0.6 * dt;
            coin.position.addScaledVector(coin.velocity, dt);
            coin.rotation.addScaledVector(coin.spin, dt);
            alive++;
          }
          dummy.position.copy(coin.position);
          dummy.rotation.set(coin.rotation.x, coin.rotation.y, coin.rotation.z);
          dummy.scale.setScalar(
            started && coin.position.y >= -3 ? coin.scale : 0,
          );
          dummy.updateMatrix();
          coins.setMatrixAt(i, dummy.matrix);
        }
        coins.visible = age >= 0 && alive > 0 && Number.isFinite(coinStart);
        coins.instanceMatrix.needsUpdate = true;
        dummy.scale.setScalar(1);
        scene.userData.coins = coins.visible ? alive : 0;
      }
      if (key) {
        key.rotation.y = reduced ? 0 : turn;
        const progress = Math.min(
          1,
          (performance.now() / 1000 - keyScaleStarted) /
            (keyScaleTo === 0 ? 0.1 : 0.6),
        );
        const eased =
          keyScaleTo === 0
            ? progress ** 3
            : 1 + 2.7 * (progress - 1) ** 3 + 1.7 * (progress - 1) ** 2;
        keyScale = keyScaleFrom + (keyScaleTo - keyScaleFrom) * eased;
        key.scale.setScalar(keyScale);
      }
    },
    dispose() {
      window.removeEventListener("renaissance:key-insert", rain);
      window.removeEventListener("renaissance:key-reset", reset);
      window.removeEventListener("renaissance:key-visibility", keyVisibility);
      butterfly?.material.uniforms.tMap.value.dispose();
      globe?.material.uniforms.uColorMap.value.dispose();
    },
  };
}
