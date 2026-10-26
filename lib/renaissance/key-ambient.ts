import * as THREE from "three";
import config from "./data/key-popup.json";

export type KeyAmbientAlignment = {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
};

export type KeyAmbientModel = {
  /** World position of the prop's model group, before its individual model offset. */
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  pickedUp: boolean;
  visible: boolean;
  handle: string;
};

const TAU = Math.PI * 2;
const goldColors = [
  [1, 0.85, 0.5],
  [1, 0.5, 0.2],
  [1, 0.75, 0.45],
  [1, 0.6, 0.3],
  [0.95, 0.8, 0.4],
  [1, 0.7, 0.35],
  [0.9, 0.65, 0.3],
  [1, 0.55, 0.25],
  [0.95, 0.75, 0.4],
  [1, 0.6, 0.35],
  [0.9, 0.7, 0.3],
  [1, 0.8, 0.45],
].map(([r, g, b]) => new THREE.Color(r, g, b));
const neonColors = [
  [0.2, 1, 0.9],
  [1, 0.1, 0.8],
  [0.4, 0.9, 1],
  [0.9, 0.3, 1],
  [0.3, 1, 0.5],
  [1, 0.6, 0.1],
  [0.1, 0.7, 1],
  [1, 0.2, 0.4],
  [0.5, 1, 0.3],
  [0.8, 0.2, 1],
  [0.2, 0.9, 0.7],
  [1, 0.4, 0.6],
].map(([r, g, b]) => new THREE.Color(r, g, b));

const frameLerp = (base: number, delta: number) =>
  1 - Math.pow(1 - base, delta * 60);

/** Rebuild the original construction grid as one equivalent line-segment mesh. */
function createGrid() {
  const points: THREE.Vector3[] = [];
  const point = (x: number, y: number) =>
    new THREE.Vector3(
      (x * 80) / 1440 - 30,
      (-y * 50) / 890 + (30 * 890) / 1440,
      0,
    );
  const lines = [
    [889.8, 890, 889.8, 0],
    [549.8, 890, 549.8, 0],
    [719.8, 890, 719.8, 0],
    [889.83, 889.895, 1439.83, -0.10515],
    [550.17, 0.105139, 0.17016, 890.105],
    [1099.8, 890, 1099.8, 550],
    [1019.8, 680, 1019.8, 550],
    [1049.8, 680, 1049.8, 630],
    [1100, 680.2, 889, 680.2],
    [1100, 630.2, 1020, 630.2],
    [1050, 649.2, 1021, 649.2],
    [1440, 550.2, 890, 550.2],
    [340.2, 0, 340.2, 340],
    [420.2, 210, 420.2, 340],
    [390.2, 210, 390.2, 260],
    [340, 209.8, 551, 209.8],
    [340, 259.8, 420, 259.8],
    [390, 240.8, 419, 240.8],
    [0, 339.8, 550, 339.8],
    [1439.89, 890.17, -0.105109, 0.170124],
    [1440.11, 0.170129, 0.105085, 890.17],
    [1445, 445.2, 5.00009, 445.2],
  ];
  for (const [x1, y1, x2, y2] of lines)
    points.push(point(x1, y1), point(x2, y2));
  for (const [cx, cy] of [
    [1541, 855],
    [-101, 855],
    [1541, 35],
    [-101, 35],
  ]) {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU,
        b = ((i + 1) / 64) * TAU;
      points.push(point(cx + Math.cos(a) * 917, cy + Math.sin(a) * 917));
      points.push(point(cx + Math.cos(b) * 917, cy + Math.sin(b) * 917));
    }
  }
  const grid = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.2,
      transparent: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  grid.name = "key-construction-grid";
  grid.position.z = -8;
  return grid;
}

class BoidHead {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  readonly acceleration = new THREE.Vector3();
  readonly maxSpeed = 0.03 + Math.random() * 0.04;
  readonly maxForce = 0.0015 + Math.random() * 0.002;
  readonly swimPhase1 = Math.random() * TAU;
  readonly swimPhase2 = Math.random() * TAU;
  readonly swimPhase3 = Math.random() * TAU;
  readonly swimFreq1 = 2 + Math.random() * 1.5;
  readonly swimFreq2 = 3 + Math.random() * 2;
  readonly swimFreq3 = 4 + Math.random() * 3;
  readonly swimAmp = 0.008 + Math.random() * 0.006;
  readonly bodyWaveSpeed = 6 + Math.random() * 3;
  readonly bodyWaveAmp = 0.025 + Math.random() * 0.015;
  readonly helixPhase = Math.random() * TAU;
  readonly helixFreq = 3 + Math.random() * 2;
  readonly helixRadius = 0.06 + Math.random() * 0.04;
  readonly targetLerpSpeed = 0.04 + Math.random() * 0.08;
  readonly zLerpSpeed = 0.03 + Math.random() * 0.06;
  readonly lerpedTarget = new THREE.Vector3();
  private readonly steer = new THREE.Vector3();
  private readonly toTarget = new THREE.Vector3();
  private readonly tangent = new THREE.Vector3();
  private currentZ = 0;

  constructor(index: number, total: number) {
    const angle = (index / Math.max(total, 3)) * TAU + Math.random() * 0.5;
    const radius = 0.3 + Math.random() * 0.8,
      speed = 0.02 + Math.random() * 0.03;
    this.position = new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      (Math.random() - 0.5) * 0.5,
    );
    this.velocity = new THREE.Vector3(
      -Math.sin(angle) * speed,
      Math.cos(angle) * speed,
      (Math.random() - 0.5) * 0.015,
    );
  }

  private separate(others: BoidHead[]) {
    this.steer.set(0, 0, 0);
    let count = 0;
    for (const other of others) {
      if (other === this) continue;
      const dx = this.position.x - other.position.x;
      const dy = this.position.y - other.position.y;
      const dz = this.position.z - other.position.z;
      const squaredDistance = dx * dx + dy * dy + dz * dz;
      if (squaredDistance <= 0 || squaredDistance >= 0.16) continue;
      const inverseDistance = 1 / Math.sqrt(squaredDistance);
      this.steer.x += dx * inverseDistance * inverseDistance;
      this.steer.y += dy * inverseDistance * inverseDistance;
      this.steer.z += dz * inverseDistance * inverseDistance;
      count++;
    }
    if (!count) return;
    this.steer.divideScalar(count);
    const length = this.steer.length();
    if (length > 0)
      this.steer
        .multiplyScalar(this.maxSpeed / length)
        .sub(this.velocity)
        .clampLength(0, this.maxForce * 2);
  }

  private orbit(target: THREE.Vector3, radius: number, moving: number) {
    this.toTarget.set(
      target.x - this.position.x,
      target.y - this.position.y,
      0,
    );
    const distance = this.toTarget.length();
    this.steer.set(0, 0, 0);
    if (moving > 0.1 || distance > radius * 1.3) {
      if (distance > 0.001)
        this.steer
          .copy(this.toTarget)
          .multiplyScalar((this.maxSpeed * (0.8 + moving * 2)) / distance);
    } else if (distance < radius * 0.5 && distance > 0.001) {
      this.steer
        .copy(this.toTarget)
        .multiplyScalar((-this.maxSpeed * 0.3) / distance);
    }
    if (distance > 0.001) {
      this.tangent
        .set(-this.toTarget.y / distance, this.toTarget.x / distance, 0)
        .multiplyScalar(this.maxSpeed * 1.1 * (1 - moving * 0.8));
      this.steer.add(this.tangent);
    }
    this.steer.clampLength(0, this.maxForce * (2.5 + moving * 3));
  }

  update(
    others: BoidHead[],
    target: THREE.Vector3,
    radius: number,
    time: number,
    moving: number,
    delta: number,
    modelZ: number,
  ) {
    this.lerpedTarget.lerp(target, frameLerp(this.targetLerpSpeed, delta));
    this.currentZ +=
      (modelZ - this.currentZ) * frameLerp(this.zLerpSpeed, delta);
    this.separate(others);
    this.acceleration.add(this.steer.multiplyScalar(1.2));
    this.orbit(this.lerpedTarget, radius, moving);
    this.acceleration.add(this.steer.multiplyScalar(1.5));
    this.velocity.add(this.acceleration).clampLength(0, this.maxSpeed);
    this.position.addScaledVector(this.velocity, delta * 60);
    this.acceleration.set(0, 0, 0);
    const wave =
      Math.sin(time * this.swimFreq1 + this.swimPhase1) * 0.5 +
      Math.sin(time * this.swimFreq2 + this.swimPhase2) * 0.3 +
      Math.sin(time * this.swimFreq3 + this.swimPhase3) * 0.2;
    const speed = this.velocity.length();
    if (speed > 0.001) {
      const perpX = -this.velocity.y / speed,
        perpY = this.velocity.x / speed;
      const wobble = wave * this.swimAmp;
      const helix =
        Math.cos(time * this.helixFreq + this.helixPhase) *
        this.helixRadius *
        0.12;
      this.position.x += perpX * (wobble + helix);
      this.position.y += perpY * (wobble + helix);
    }
    this.position.z =
      this.currentZ + THREE.MathUtils.clamp(this.position.z, -0.3, 0.3) + 3;
  }
}

type Ribbon = {
  head: BoidHead;
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  path: THREE.Vector3[];
  chainLerp: number;
  width: number;
};

/** Native geometry, particle drift and flocking from the published popup artwork. */
export function createKeyAmbient(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "key-ambient";
  const grid = createGrid(),
    flock = new THREE.Group();
  flock.name = "key-ribbon-flock";
  const ribbons: Ribbon[] = [],
    heads: BoidHead[] = [],
    discovered = new Set<string>();
  const particleConfig = config.particles;
  const particlePositions = new Float32Array(particleConfig.count * 3);
  const particleVelocities = new Float32Array(particleConfig.count * 3);
  for (let i = 0; i < particleConfig.count; i++) {
    const p = i * 3;
    particlePositions[p] = (Math.random() - 0.5) * particleConfig.bounds.x;
    particlePositions[p + 1] = (Math.random() - 0.5) * particleConfig.bounds.y;
    particlePositions[p + 2] =
      particleConfig.bounds.zMin -
      Math.random() * (particleConfig.bounds.zMax - particleConfig.bounds.zMin);
    for (let axis = 0; axis < 3; axis++)
      particleVelocities[p + axis] = (Math.random() - 0.5) * 0.01;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3),
  );
  const particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: particleConfig.size,
      transparent: true,
      opacity: particleConfig.opacity,
    }),
  );
  particles.name = "key-drifting-particles";
  // Positions wrap, so their initial bounding sphere must not cull later frames.
  particles.frustumCulled = false;
  root.add(grid, particles, flock);
  scene.add(root);

  let disposed = false,
    frame = 0,
    lastTime: number | undefined,
    elapsed = 0;
  let lastX = 0,
    lastY = 0,
    moving = 0,
    colorPickedUp = 0,
    lastColorPickedUp = -1;
  let hasDiscoveredInitial = false,
    wasPickedUp = false;
  const target = new THREE.Vector3(),
    tangent = new THREE.Vector3();
  const perpendicular = new THREE.Vector3(),
    up = new THREE.Vector3(0, 0, 1);

  function addBoid() {
    if (ribbons.length >= config.boids.maxCount) return;
    const index = ribbons.length,
      head = new BoidHead(index, index + 1);
    const count =
      config.boids.baseTrailPoints + Math.floor((Math.random() - 0.5) * 2);
    const path = Array.from({ length: count }, () => head.position.clone());
    const positions = new Float32Array(count * 6),
      uv = new Float32Array(count * 4);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      uv.set([0, i / (count - 1), 1, i / (count - 1)], i * 4);
      if (i < count - 1) {
        const v = i * 2;
        indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(indices);
    const material = new THREE.ShaderMaterial({
      vertexShader: config.boids.vertexShader,
      fragmentShader: config.boids.fragmentShader,
      uniforms: { uColor: { value: neonColors[index].clone() } },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `key-ribbon-${index}`;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    heads.push(head);
    ribbons.push({
      head,
      mesh,
      path,
      chainLerp: config.boids.baseChainLerp + (Math.random() - 0.5) * 0.1,
      width: 0.7 + Math.random() * 0.6,
    });
    flock.add(mesh);
  }
  addBoid();

  function updateRibbon(ribbon: Ribbon, delta: number) {
    const { head, path, mesh } = ribbon;
    path[0].copy(head.position);
    const trailLerp = frameLerp(ribbon.chainLerp, delta);
    for (let i = 1; i < path.length; i++) path[i].lerp(path[i - 1], trailLerp);
    const attribute = mesh.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    for (let i = 0; i < path.length; i++) {
      const point = path[i],
        previous = path[Math.max(i - 1, 0)];
      const next = path[Math.min(i + 1, path.length - 1)];
      tangent.subVectors(previous, next);
      const length = tangent.length();
      if (length > 0.001) tangent.multiplyScalar(1 / length);
      else tangent.set(1, 0, 0);
      perpendicular.crossVectors(tangent, up).normalize();
      const t = i / (path.length - 1);
      const fishShape = Math.pow(1 - t, 0.3) * Math.pow(t + 0.1, 0.5);
      const width = config.boids.ribbonWidth * fishShape * 1.5 * ribbon.width;
      const waveOffset = t * 6;
      const wave1 = Math.sin(
        elapsed * head.bodyWaveSpeed + head.swimPhase1 + waveOffset,
      );
      const wave2 =
        Math.sin(
          elapsed * head.bodyWaveSpeed * 0.7 +
            head.swimPhase2 +
            waveOffset * 1.3,
        ) * 0.4;
      const wave = (wave1 + wave2) * t * t * head.bodyWaveAmp;
      const waveX = perpendicular.x * wave,
        waveY = perpendicular.y * wave,
        v = i * 6;
      positions[v] = point.x + perpendicular.x * width + waveX;
      positions[v + 1] = point.y + perpendicular.y * width + waveY;
      positions[v + 2] = point.z + perpendicular.z * width;
      positions[v + 3] = point.x - perpendicular.x * width + waveX;
      positions[v + 4] = point.y - perpendicular.y * width + waveY;
      positions[v + 5] = point.z - perpendicular.z * width;
    }
    attribute.needsUpdate = true;
  }

  return {
    /** `time` is monotonic seconds; positions are in the popup scene's world space. */
    update(
      time: number,
      alignment: KeyAmbientAlignment,
      model: KeyAmbientModel,
    ) {
      if (disposed || !Number.isFinite(time)) return;
      const delta =
        lastTime === undefined
          ? 1 / 60
          : THREE.MathUtils.clamp(time - lastTime, 0, 0.05);
      lastTime = time;
      elapsed += delta;
      grid.position.set(alignment.x, alignment.y, -8);
      particles.position.set(alignment.x, alignment.y, 0);
      flock.position.set(alignment.x, alignment.y, 0);

      // The original adds a ribbon at startup and when a new chapter's prop is picked up.
      if (
        model.visible &&
        model.handle &&
        model.pickedUp &&
        (!hasDiscoveredInitial || !wasPickedUp)
      ) {
        hasDiscoveredInitial = true;
        if (!discovered.has(model.handle)) {
          discovered.add(model.handle);
          addBoid();
        }
      }
      wasPickedUp = model.pickedUp;

      frame++;
      if (frame % 2 === 0) {
        for (let i = 0; i < particleConfig.count; i++) {
          const p = i * 3;
          for (let axis = 0; axis < 3; axis++)
            particlePositions[p + axis] += particleVelocities[p + axis] * 2;
          if (Math.abs(particlePositions[p]) > 20) particlePositions[p] *= -1;
          if (Math.abs(particlePositions[p + 1]) > 15)
            particlePositions[p + 1] *= -1;
          if (particlePositions[p + 2] < -35 || particlePositions[p + 2] > -10)
            particlePositions[p + 2] = -15 - Math.random() * 20;
        }
        particleGeometry.getAttribute("position").needsUpdate = true;
      }

      const speed = Math.hypot(alignment.x - lastX, alignment.y - lastY);
      const targetMoving = model.pickedUp ? Math.min(speed * 20, 1) : 0;
      const moveLerp = targetMoving > moving && model.pickedUp ? 0.25 : 0.06;
      moving += (targetMoving - moving) * frameLerp(moveLerp, delta);
      const orbitRadius =
        config.boids.baseOrbitRadius *
        (1 - moving * config.boids.movingOrbitShrinkFactor);
      colorPickedUp +=
        ((model.pickedUp ? 1 : 0) - colorPickedUp) * frameLerp(0.15, delta);
      if (Math.abs(colorPickedUp - lastColorPickedUp) > 0.005) {
        lastColorPickedUp = colorPickedUp;
        for (let i = 0; i < ribbons.length; i++) {
          const color = ribbons[i].mesh.material.uniforms.uColor
            .value as THREE.Color;
          color.lerpColors(neonColors[i], goldColors[i], colorPickedUp);
        }
      }
      lastX = alignment.x;
      lastY = alignment.y;
      target.set(
        model.position.x - alignment.x,
        model.position.y - alignment.y,
        model.position.z,
      );
      // The original flock stays alive after the prop dissolves; its orientation is independent.
      const modelZ = model.position.z - 3;
      for (const head of heads)
        head.update(heads, target, orbitRadius, elapsed, moving, delta, modelZ);
      for (const ribbon of ribbons) updateRibbon(ribbon, delta);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(root);
      grid.geometry.dispose();
      grid.material.dispose();
      particleGeometry.dispose();
      particles.material.dispose();
      for (const { mesh } of ribbons) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      root.clear();
      flock.clear();
      ribbons.length = heads.length = 0;
      discovered.clear();
    },
  };
}
