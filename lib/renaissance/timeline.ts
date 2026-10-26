// A small reader for the archived Theatre data. No Theatre or Remix runtime is
// imported: the authored numeric tracks drive our own Three.js scene objects.
type Value = number | string | boolean | null | { [key: string]: Value };
type ObjectValue = { [key: string]: Value };
type Keyframe = {
  position: number;
  value: Value;
  connectedRight: boolean;
  type: string;
  handles: number[];
};
type Track = { path: string[]; frames: Keyframe[] };
type Sheet = {
  staticOverrides: { byObject: Record<string, ObjectValue> };
  sequence: {
    length: number;
    tracksByObject: Record<
      string,
      {
        trackIdByPropPath: Record<string, string>;
        trackData: Record<string, { keyframes: Keyframe[] }>;
      }
    >;
  };
};
export type TimelineData = { sheetsById: Record<string, Sheet> };

function merge(target: ObjectValue, source: ObjectValue) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object") {
      const child = target[key];
      target[key] = merge(
        child && typeof child === "object" ? child : {},
        value,
      );
    } else target[key] = value;
  }
  return target;
}

function cubic(t: number, a: number, b: number) {
  return 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
}

function interpolate(a: Keyframe, b: Keyframe, time: number): Value {
  if (
    !a.connectedRight ||
    typeof a.value !== "number" ||
    typeof b.value !== "number"
  )
    return a.value;
  const progress = (time - a.position) / (b.position - a.position);
  if (a.type === "hold") return a.value;
  let left = 0,
    right = 1,
    t = progress;
  for (let i = 0; i < 16; i++) {
    const x = cubic(t, a.handles[2], b.handles[0]);
    if (Math.abs(x - progress) < 0.00001) break;
    if (x < progress) left = t;
    else right = t;
    t = (left + right) / 2;
  }
  return a.value + (b.value - a.value) * cubic(t, a.handles[3], b.handles[1]);
}

export class Timeline {
  private sheet: Sheet;
  private tracks = new Map<string, Track[]>();

  constructor(data: TimelineData) {
    this.sheet = data.sheetsById.Scene;
    for (const [key, object] of Object.entries(
      this.sheet.sequence.tracksByObject,
    )) {
      this.tracks.set(
        key,
        Object.entries(object.trackIdByPropPath)
          .map(([path, id]) => ({
            path: JSON.parse(path),
            frames: [...object.trackData[id].keyframes].sort(
              (a, b) => a.position - b.position,
            ),
          }))
          .filter((track) => track.frames.length),
      );
    }
  }

  sample<T extends object>(key: string, time: number, defaults: T): T {
    time = Math.max(0, Math.min(this.sheet.sequence.length, time));
    const result = merge(
      structuredClone(defaults) as ObjectValue,
      this.sheet.staticOverrides.byObject[key] ?? {},
    );
    for (const { path, frames } of this.tracks.get(key) ?? []) {
      let value: Value;
      if (time <= frames[0].position) value = frames[0].value;
      else if (time >= frames[frames.length - 1].position)
        value = frames[frames.length - 1].value;
      else {
        const end = frames.findIndex((frame) => frame.position > time);
        value = interpolate(frames[end - 1], frames[end], time);
      }
      let target = result;
      for (const part of path.slice(0, -1)) {
        if (!target[part] || typeof target[part] !== "object")
          target[part] = {};
        target = target[part] as ObjectValue;
      }
      target[path[path.length - 1]] = value;
    }
    return result as T;
  }
}
