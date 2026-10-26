import { DataTexture, RGBAFormat, RepeatWrapping, LinearFilter } from "three";

// A seeded, tileable four-octave Perlin field makes transition QA repeatable.
export function createNoiseTexture() {
  let seed = 26012026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const permutation = new Uint8Array(512);
  for (let i = 0; i < 256; i++) permutation[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  for (let i = 0; i < 256; i++) permutation[256 + i] = permutation[i];
  const gradients = [
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const fade = (t: number) => t ** 3 * (t * (t * 6 - 15) + 10);
  const mix = (a: number, b: number, t: number) => a + t * (b - a);
  const dot = (hash: number, x: number, y: number) =>
    gradients[hash & 7][0] * x + gradients[hash & 7][1] * y;
  function perlin(x: number, y: number, period: number) {
    const ix = Math.floor(x) & 255,
      iy = Math.floor(y) & 255;
    const fx = x - Math.floor(x),
      fy = y - Math.floor(y);
    const x0 = ix % period,
      x1 = (ix + 1) % period,
      y0 = iy % period,
      y1 = (iy + 1) % period;
    return mix(
      mix(
        dot(permutation[permutation[x0] + y0], fx, fy),
        dot(permutation[permutation[x1] + y0], fx - 1, fy),
        fade(fx),
      ),
      mix(
        dot(permutation[permutation[x0] + y1], fx, fy - 1),
        dot(permutation[permutation[x1] + y1], fx - 1, fy - 1),
        fade(fx),
      ),
      fade(fy),
    );
  }
  const size = 256,
    data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let value = 0,
        amplitude = 0.5,
        frequency = 1;
      for (let octave = 0; octave < 4; octave++) {
        value +=
          amplitude *
          perlin(
            (x / size) * 8 * frequency,
            (y / size) * 8 * frequency,
            8 * frequency,
          );
        amplitude *= 0.5;
        frequency *= 2;
      }
      const v = Math.floor(Math.max(0, Math.min(255, (value + 1) * 127.5))),
        offset = (y * size + x) * 4;
      data.set([v, v, v, 255], offset);
    }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
