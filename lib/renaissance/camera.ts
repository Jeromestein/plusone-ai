// Per-scene orbit and pointer damping reconstructed from the reference camera.
import * as THREE from "three";

type V = { x: number; y: number; z: number };
export type CameraState = {
  position: V;
  target: V;
  rotation: V;
  fov: number;
  gaze: number;
  freeOrbit: boolean;
};
export const originalCameraDefaults: CameraState = {
  position: { x: 0, y: 0, z: 4 },
  target: { x: 0, y: 0, z: 1 },
  rotation: { x: 0, y: 0, z: 0 },
  fov: 30,
  gaze: 0.5,
  freeOrbit: false,
};
export function cameraMotion() {
  return {
    pan: 0,
    tilt: 0,
    interaction: 1,
    offset: new THREE.Vector3(),
    base: new THREE.Vector3(),
    target: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    result: new THREE.Vector3(),
    localOffset: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    rotationQuaternion: new THREE.Quaternion(),
  };
}
// rawPointerDown uses (-1,-1) at top-left and (1,1) bottom-right, as the current
// app's Stage.pointer does. Do not pre-smooth it; original smoothing is below.
export function updateCamera(
  camera: THREE.PerspectiveCamera,
  state: CameraState,
  motion: ReturnType<typeof cameraMotion>,
  rawPointerDown: THREE.Vector2,
  aspect: number,
  customCamera?: THREE.PerspectiveCamera,
  targetOffset = new THREE.Vector3(),
  isGlobeDragging = false,
  globeVelocity = 0,
) {
  const velocity = Math.abs(globeVelocity);
  const interactionTarget =
    isGlobeDragging || velocity > 1e-4
      ? 0.05 + Math.max(0, 0.2 - velocity * 10)
      : 1;
  motion.interaction += (interactionTarget - motion.interaction) * 0.1;
  const range = state.freeOrbit ? Math.PI * 0.5 : 0.1 * state.gaze;
  const requestedPan = rawPointerDown.x * range;
  const requestedTilt = -rawPointerDown.y * range;
  const smoothing = 0.1 * motion.interaction;
  motion.pan += (requestedPan * motion.interaction - motion.pan) * smoothing;
  motion.tilt += (requestedTilt * motion.interaction - motion.tilt) * smoothing;

  if (customCamera) {
    customCamera.getWorldPosition(camera.position);
    customCamera.getWorldQuaternion(camera.quaternion);
    motion.localOffset
      .set(motion.pan, motion.tilt, 0)
      .applyQuaternion(camera.quaternion);
    camera.position.add(motion.localOffset);
    motion.rotation.set(
      -motion.tilt + state.rotation.x,
      motion.pan + state.rotation.y,
      state.rotation.z,
    );
    motion.rotationQuaternion.setFromEuler(motion.rotation);
    camera.quaternion.multiply(motion.rotationQuaternion);
  } else {
    motion.offset.lerp(targetOffset, 0.05);
    motion.target
      .set(state.target.x, state.target.y, state.target.z)
      .add(motion.offset);
    motion.base.set(state.position.x, state.position.y, state.position.z);
    motion.direction.subVectors(motion.base, motion.target).normalize();
    const distance = motion.base.distanceTo(motion.target);
    const { x, y, z } = motion.direction;
    // Preserve original signs exactly. This is not a conventional Euler orbit.
    const xPan = x * Math.cos(-motion.pan) - z * Math.sin(-motion.pan);
    const zPan = x * Math.sin(motion.pan) + z * Math.cos(motion.pan);
    motion.result
      .set(
        xPan * Math.cos(-motion.tilt),
        y * Math.cos(-motion.tilt) - Math.sin(-motion.tilt),
        zPan * Math.cos(-motion.tilt),
      )
      .normalize()
      .multiplyScalar(distance)
      .add(motion.target);
    camera.position.copy(motion.result);
    camera.lookAt(motion.target);
    camera.rotateX(state.rotation.x);
    camera.rotateY(state.rotation.y);
    camera.rotateZ(state.rotation.z);
  }
  camera.fov = state.freeOrbit ? 90 : state.fov;
  camera.near = 0.1;
  camera.far = 1000;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
export const animationKey = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/^[^a-zA-Z]/, "anim_$&")
    .replace(/^_+/, "anim_");
