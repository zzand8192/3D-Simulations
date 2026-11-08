// Small post chain: scene -> HDR target (MSAA + depth) -> bright-pass at 1/4 res -> blur H/V -> composite
// (depth-of-field gather for the macro look + bloom + ACES tone mapping + sRGB). Logarithmic depth is decoded
// back to view distance for the circle of confusion.
import * as THREE from 'three';

const QUAD_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
export function makePost(renderer, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  rt.depthTexture = new THREE.DepthTexture(W, H); rt.depthTexture.type = THREE.UnsignedIntType;
  const w4 = Math.round(W / 4), h4 = Math.round(H / 4);
  const sA = new THREE.WebGLRenderTarget(w4, h4, { type: THREE.HalfFloatType }), sB = new THREE.WebGLRenderTarget(w4, h4, { type: THREE.HalfFloatType });
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null); quad.frustumCulled = false; quadScene.add(quad);
  const bright = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uTh: { value: 1.0 }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) } }, vertexShader: QUAD_V, toneMapped: false,
    fragmentShader: `uniform sampler2D tSrc; uniform float uTh; uniform vec2 uPx; varying vec2 vUv;
      void main(){ vec3 c = vec3(0.0); for (int y = -1; y <= 2; y++) for (int x = -1; x <= 2; x++) c += texture2D(tSrc, vUv + vec2(float(x) - 0.5, float(y) - 0.5) * uPx * 1.0).rgb;
        c /= 16.0; float l = max(c.r, max(c.g, c.b)); float k = smoothstep(uTh, uTh * 1.8, l); gl_FragColor = vec4(c * k, 1.0); }` });
  const blur = new THREE.ShaderMaterial({ uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: QUAD_V, toneMapped: false,
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
      void main(){ float w[5]; w[0] = 0.227; w[1] = 0.194; w[2] = 0.121; w[3] = 0.054; w[4] = 0.016;
        vec3 c = texture2D(tSrc, vUv).rgb * w[0]; for (int i = 1; i < 5; i++) { c += texture2D(tSrc, vUv + uDir * float(i) * 1.6).rgb * w[i]; c += texture2D(tSrc, vUv - uDir * float(i) * 1.6).rgb * w[i]; }
        gl_FragColor = vec4(c, 1.0); }` });
  const comp = new THREE.ShaderMaterial({
    uniforms: { tSrc: { value: rt.texture }, tDepth: { value: rt.depthTexture }, tBloom: { value: sA.texture }, uFar: { value: 1e9 }, uFocus: { value: 12 }, uAp: { value: 0 }, uBloom: { value: 0 }, uPx: { value: new THREE.Vector2(1 / W, 1 / H) }, uMaxR: { value: 14 } },
    vertexShader: QUAD_V,
    fragmentShader: `uniform sampler2D tSrc, tDepth, tBloom; uniform float uFar, uFocus, uAp, uBloom, uMaxR; uniform vec2 uPx; varying vec2 vUv;
      float dist(vec2 uv){ float d = texture2D(tDepth, uv).x; return exp2(d * log2(uFar + 1.0)) - 1.0; }
      float coc(float z){ return clamp(abs(1.0 / uFocus - 1.0 / max(z, 1e-3)) * uFocus * uAp, 0.0, uMaxR); }
      void main(){
        vec3 base = texture2D(tSrc, vUv).rgb; vec3 col = base;
        if (uAp > 0.001) {
          float z0 = dist(vUv), c0 = coc(z0);
          vec3 acc = base; float ws = 1.0;
          for (int i = 0; i < 16; i++) {
            float a = float(i) * 2.39996, r = sqrt((float(i) + 0.5) / 16.0);
            vec2 o = vec2(cos(a), sin(a)) * r;
            vec2 uv = vUv + o * uMaxR * uPx;
            float zs = dist(uv), cs = coc(zs);
            float cEff = zs < z0 ? cs : min(cs, c0);   // foreground blur spills over; background is limited by this pixel's blur
            float w = smoothstep(r * uMaxR - 1.0, r * uMaxR + 0.5, cEff);
            acc += texture2D(tSrc, uv).rgb * w; ws += w;
          }
          col = acc / ws;
        }
        col += texture2D(tBloom, vUv).rgb * uBloom;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  function render(scene, camera, p) {
    renderer.setRenderTarget(rt); renderer.render(scene, camera);
    if (p.bloom > 0.001) {
      quad.material = bright; bright.uniforms.tSrc.value = rt.texture; bright.uniforms.uTh.value = p.threshold ?? 1.0; renderer.setRenderTarget(sA); renderer.render(quadScene, quadCam);
      quad.material = blur;
      for (let i = 0; i < 2; i++) {
        blur.uniforms.tSrc.value = sA.texture; blur.uniforms.uDir.value.set(1 / w4, 0); renderer.setRenderTarget(sB); renderer.render(quadScene, quadCam);
        blur.uniforms.tSrc.value = sB.texture; blur.uniforms.uDir.value.set(0, 1 / h4); renderer.setRenderTarget(sA); renderer.render(quadScene, quadCam);
      }
    }
    Object.assign(comp.uniforms.uFar, { value: camera.far });
    comp.uniforms.uFocus.value = p.focus; comp.uniforms.uAp.value = p.aperture; comp.uniforms.uBloom.value = p.bloom; comp.uniforms.uMaxR.value = p.maxR ?? 14;
    quad.material = comp; renderer.setRenderTarget(null); renderer.render(quadScene, quadCam);
  }
  return { render };
}
