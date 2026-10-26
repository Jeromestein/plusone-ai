import * as THREE from "three";
import { Pass, FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import shaders from "./data/bloom-shaders.json";

const vertex =
  "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}";
const target = () =>
  new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
  });
const material = (
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    defines: { FRAMEBUFFER_PRECISION_HIGH: 1 },
  });

/** Eight-level mipmap blur and HDR SCREEN blend used by the reference artwork. */
export class BloomPass extends Pass {
  strength = 8;
  private luminanceTarget = target();
  private down = Array.from({ length: 8 }, target);
  private up = Array.from({ length: 7 }, target);
  private luminance = material(vertex, shaders.luminance, {
    inputBuffer: { value: null },
    threshold: { value: 1 },
    smoothing: { value: 0.03 },
  });
  private downsample = material(
    shaders["downsample-vertex"],
    shaders["downsample-fragment"],
    { inputBuffer: { value: null }, texelSize: { value: new THREE.Vector2() } },
  );
  private upsample = material(
    shaders["upsample-vertex"],
    shaders["upsample-fragment"],
    {
      inputBuffer: { value: null },
      supportBuffer: { value: null },
      texelSize: { value: new THREE.Vector2() },
      radius: { value: 0.85 },
    },
  );
  private screen = material(
    vertex,
    `uniform sampler2D baseBuffer;uniform sampler2D bloomBuffer;uniform float strength;varying vec2 vUv;void main(){vec4 base=texture2D(baseBuffer,vUv);vec4 bloom=texture2D(bloomBuffer,vUv)*strength;gl_FragColor=vec4(base.rgb+bloom.rgb-min(base.rgb*bloom.rgb,vec3(1.)),max(base.a,bloom.a));}`,
    {
      baseBuffer: { value: null },
      bloomBuffer: { value: null },
      strength: { value: 8 },
    },
  );
  private quad = new FullScreenQuad(this.screen);
  constructor() {
    super();
    Object.assign(this.luminance.defines, { THRESHOLD: 1, COLOR: 1 });
  }
  setSize(width: number, height: number) {
    this.luminanceTarget.setSize(width, height);
    this.down.forEach((buffer, i) => {
      width = Math.max(1, Math.round(width / 2));
      height = Math.max(1, Math.round(height / 2));
      buffer.setSize(width, height);
      this.up[i]?.setSize(width, height);
    });
  }
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ) {
    const draw = (
      shader: THREE.ShaderMaterial,
      output: THREE.WebGLRenderTarget | null,
    ) => {
      this.quad.material = shader;
      renderer.setRenderTarget(output);
      this.quad.render(renderer);
    };
    this.luminance.uniforms.inputBuffer.value = readBuffer.texture;
    draw(this.luminance, this.luminanceTarget);
    let input = this.luminanceTarget;
    for (const output of this.down) {
      this.downsample.uniforms.inputBuffer.value = input.texture;
      this.downsample.uniforms.texelSize.value.set(
        1 / input.width,
        1 / input.height,
      );
      draw(this.downsample, output);
      input = output;
    }
    for (let i = this.up.length - 1; i >= 0; i--) {
      this.upsample.uniforms.inputBuffer.value = input.texture;
      this.upsample.uniforms.supportBuffer.value = this.down[i].texture;
      this.upsample.uniforms.texelSize.value.set(
        1 / input.width,
        1 / input.height,
      );
      draw(this.upsample, this.up[i]);
      input = this.up[i];
    }
    this.screen.uniforms.baseBuffer.value = readBuffer.texture;
    this.screen.uniforms.bloomBuffer.value = input.texture;
    this.screen.uniforms.strength.value = this.strength;
    draw(this.screen, this.renderToScreen ? null : writeBuffer);
  }
  dispose() {
    [this.luminanceTarget, ...this.down, ...this.up].forEach((t) =>
      t.dispose(),
    );
    [this.luminance, this.downsample, this.upsample, this.screen].forEach((m) =>
      m.dispose(),
    );
    this.quad.dispose();
  }
}
