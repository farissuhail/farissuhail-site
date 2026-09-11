// Car Studio · shared interactive 3D studio engine for farissuhail.com (Petrolhead Technica)
// One engine, one dataset per car. See gt3-studio.js and r32-studio.js for configs.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/* ───────────────────────── shared data ───────────────────────── */
export const ENVIRONMENTS = [
  { id: 'studio', name: 'Studio' }, { id: 'cloudy', name: 'Cloudy sky' },
  { id: 'night', name: 'Night street' }, { id: 'hangar', name: 'Hangar' },
];
// HDRIs: Poly Haven, CC0 (https://polyhaven.com/license)
const ENVIRONMENT_FILES = { studio: 'studio_small_09.hdr', cloudy: 'kloofendal_overcast.hdr', night: 'cobblestone_street_night.hdr', hangar: 'aircraft_workshop_01.hdr' };
const DEFAULT_STATE = {
  group: 'all', explosion: 0, transparency: 0, paint: 0, theme: 'dark',
  environment: 'studio', lightAngle: 54, shadows: true, autoRotate: false,
};

/* ───────────────────────── model tools ───────────────────────── */
/** Separate disconnected geometry islands while retaining every vertex attribute. */
export function splitConnectedGeometry(source) {
  const geometry = source.index ? source.toNonIndexed() : source.clone();
  const position = geometry.getAttribute('position');
  const roots = Array.from({ length: position.count / 3 }, (_, i) => i);
  const find = i => { while (roots[i] !== i) { roots[i] = roots[roots[i]]; i = roots[i]; } return i; };
  const shared = new Map();
  for (let i = 0; i < position.count; i++) {
    const key = [position.getX(i), position.getY(i), position.getZ(i)].map(n => n.toFixed(5)).join(',');
    const triangle = Math.floor(i / 3), previous = shared.get(key);
    if (previous === undefined) shared.set(key, triangle); else roots[find(triangle)] = find(previous);
  }
  const islands = new Map();
  for (let i = 0; i < position.count; i++) {
    const key = find(Math.floor(i / 3));
    if (!islands.has(key)) islands.set(key, []);
    islands.get(key).push(i);
  }
  const result = [...islands.values()].map(vertices => {
    const island = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      const values = new Float32Array(vertices.length * attribute.itemSize);
      vertices.forEach((sourceIndex, targetIndex) => {
        for (let axis = 0; axis < attribute.itemSize; axis++) values[targetIndex * attribute.itemSize + axis] = attribute.getComponent(sourceIndex, axis);
      });
      island.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize));
    }
    island.computeBoundingBox(); island.computeBoundingSphere(); return island;
  });
  geometry.dispose(); return result;
}

/* ───────────────────────── effects ───────────────────────── */
/** Fade the rendered vehicle as one image, preserving its original glass and PBR materials. */
class VehicleFadePass extends Pass {
  constructor(renderer, scene, camera, vehicle, shadow) {
    super();
    this.amount = 0; this.white = false;
    this.scene = scene; this.camera = camera; this.vehicle = vehicle; this.shadow = shadow;
    this.roomOutput = new OutputPass();
    this.outlineTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.outlineScene = new THREE.Scene();
    this.copies = [];
    this.lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: .12, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false });
    this.shellMaterial = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec3 vNormal;varying vec3 vView;void main(){vec4 p=modelViewMatrix*vec4(position,1.);vNormal=normalize(normalMatrix*normal);vView=-p.xyz;gl_Position=projectionMatrix*p;}',
      fragmentShader: 'varying vec3 vNormal;varying vec3 vView;void main(){float rim=1.-abs(dot(normalize(vNormal),normalize(vView)));float density=.007+pow(rim,7.)*.18;gl_FragColor=vec4(vec3(density),1.);}',
    });
    this.material = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { foreground: { value: null }, background: { value: null }, outline: { value: null }, amount: { value: 0 }, white: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader: 'uniform sampler2D foreground;uniform sampler2D background;uniform sampler2D outline;uniform float amount;uniform float white;varying vec2 vUv;void main(){vec4 base=mix(texture2D(foreground,vUv),texture2D(background,vUv),amount);float density=1.-exp(-texture2D(outline,vUv).r*1.7);gl_FragColor=vec4(mix(base.rgb,vec3(1.-white),density*smoothstep(0.,1.,amount)),base.a);}',
    });
    this.quad = new FullScreenQuad(this.material);
    this.roomComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    this.roomComposer.renderToScreen = false; this.roomComposer.setPixelRatio(1);
    this.roomComposer.addPass(new RenderPass(scene, camera)); this.roomComposer.addPass(this.roomOutput);
  }
  setSize(width, height) { this.roomComposer.setSize(width, height); this.outlineTarget.setSize(width, height); }
  prepare() {
    if (this.copies.length) return;
    this.vehicle.traverse(object => {
      if (!object.isMesh) return;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 40), this.lineMaterial);
      const shell = new THREE.Mesh(object.geometry, this.shellMaterial);
      edges.matrixAutoUpdate = false; shell.matrixAutoUpdate = false;
      this.outlineScene.add(edges, shell); this.copies.push({ source: object, edges, shell });
    });
  }
  render(renderer, writeBuffer, readBuffer) {
    const visible = this.vehicle.visible;
    const shadowVisible = this.shadow.visible;
    this.vehicle.visible = false; this.shadow.visible = false;
    try { this.roomComposer.render(); }
    finally { this.vehicle.visible = visible; this.shadow.visible = shadowVisible; }
    this.prepare();
    for (const { source, edges, shell } of this.copies) {
      let shown = true;
      for (let ancestor = source; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) shown = false;
      edges.visible = shell.visible = shown;
      edges.matrix.copy(source.matrixWorld); shell.matrix.copy(source.matrixWorld);
    }
    const oldColor = renderer.getClearColor(new THREE.Color()), oldAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0, 0); renderer.setRenderTarget(this.outlineTarget); renderer.clear(); renderer.render(this.outlineScene, this.camera); renderer.setClearColor(oldColor, oldAlpha);
    this.material.uniforms.foreground.value = readBuffer.texture;
    this.material.uniforms.background.value = this.roomComposer.readBuffer.texture;
    this.material.uniforms.outline.value = this.outlineTarget.texture;
    this.material.uniforms.amount.value = this.amount;
    this.material.uniforms.white.value = this.white ? 1 : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  dispose() { this.roomComposer.dispose(); this.roomOutput.dispose(); this.outlineTarget.dispose(); this.lineMaterial.dispose(); this.shellMaterial.dispose(); for (const copy of this.copies) copy.edges.geometry.dispose(); this.material.dispose(); this.quad.dispose(); }
}

/** A floor-only soft contact shadow, rendered from underneath the actual mesh. */
function createContactShadow(scene, renderer, glassGroups) {
  const resolution = 768;
  const target = new THREE.WebGLRenderTarget(resolution, resolution);
  const temporary = target.clone();
  const camera = new THREE.OrthographicCamera(-3.2, 3.2, 3.2, -3.2, .01, 3);
  camera.position.set(0, -.04, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 1, 0);
  const depth = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    vertexShader: 'varying float height;void main(){vec4 world=modelMatrix*vec4(position,1.);height=world.y;gl_Position=projectionMatrix*viewMatrix*world;}',
    fragmentShader: 'varying float height;void main(){gl_FragColor=vec4(0.,0.,0.,.78*exp(-max(height,0.)*3.));}',
  });
  const material = new THREE.MeshBasicMaterial({ map: target.texture, transparent: true, depthWrite: false, toneMapped: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), material);
  plane.rotation.x = -Math.PI / 2; plane.position.y = .003; plane.renderOrder = 1; scene.add(plane);
  const blur = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { image: { value: target.texture }, step: { value: new THREE.Vector2() } },
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: 'uniform sampler2D image;uniform vec2 step;varying vec2 vUv;void main(){vec4 c=texture2D(image,vUv)*.227027;c+=(texture2D(image,vUv+step*1.384615)+texture2D(image,vUv-step*1.384615))*.316216;c+=(texture2D(image,vUv+step*3.230769)+texture2D(image,vUv-step*3.230769))*.070270;gl_FragColor=c;}',
  });
  const quad = new FullScreenQuad(blur);
  return {
    plane,
    update(vehicle) {
      const visibility = new Map();
      for (const child of scene.children) if (child !== vehicle) { visibility.set(child, child.visible); child.visible = false; }
      vehicle.traverse(object => { if (glassGroups.has(object.userData.studioGroup)) { visibility.set(object, object.visible); object.visible = false; } });
      const oldTarget = renderer.getRenderTarget();
      const oldColor = renderer.getClearColor(new THREE.Color());
      const oldAlpha = renderer.getClearAlpha();
      const oldOverride = scene.overrideMaterial;
      const oldBackground = scene.background;
      try {
        scene.background = null; scene.overrideMaterial = depth; renderer.setClearColor(0, 0);
        renderer.setRenderTarget(target); renderer.clear(); renderer.render(scene, camera);
        blur.uniforms.image.value = target.texture; blur.uniforms.step.value.set(2.5 / resolution, 0);
        renderer.setRenderTarget(temporary); renderer.clear(); quad.render(renderer);
        blur.uniforms.image.value = temporary.texture; blur.uniforms.step.value.set(0, 2.5 / resolution);
        renderer.setRenderTarget(target); renderer.clear(); quad.render(renderer);
      } finally {
        scene.overrideMaterial = oldOverride; scene.background = oldBackground;
        visibility.forEach((value, object) => { object.visible = value; });
        renderer.setClearColor(oldColor, oldAlpha); renderer.setRenderTarget(oldTarget);
      }
    },
    dispose() { target.dispose(); temporary.dispose(); depth.dispose(); blur.dispose(); quad.dispose(); plane.geometry.dispose(); material.dispose(); },
  };
}

/* ───────────────────────── scene ───────────────────────── */
/**
 * config:
 *  modelUrl, dracoPath?, environmentRoot, paints[], groups[]
 *  partMode: 'mesh' | 'assembly'   — what a selectable/explodable part is
 *  isPart(object) [assembly mode]  — which nodes are parts
 *  groupOf(object, gltf) → group id
 *  partOffset(group, center, object) → THREE.Vector3 world offset at 100 % explosion
 *  materialRole(object, material, group) → 'body' | 'rim' | 'decal' | null
 *  prepare?(gltf)  — mutate the loaded scene before parts are collected
 *  afterParts?(parts, helpers) — e.g. GT3 badge attachment
 *  alignTyres?: material name whose meshes are tyres (per-wheel floor alignment)
 *  glassGroups?: group ids excluded from the contact shadow (default ['glass'])
 *  camera?: { position:[x,y,z], target:[x,y,z] }
 */
export function createStudio(host, config, callbacks) {
  let state = { ...callbacks.state };
  let disposed = false, ready = false, frame = 0, lastTime = 0, explosion = state.explosion / 100;
  let dirty = true, shadowDirty = true, environmentRequest = 0;
  const parts = [];
  const glassGroups = new Set(config.glassGroups ?? ['glass']);
  const resources = { materials: new Set(), geometries: new Set(), textures: new Set() };
  const scene = new THREE.Scene();
  const vehicle = new THREE.Group(); scene.add(vehicle);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = config.exposure ?? .8;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const camera = new THREE.PerspectiveCamera(36, 1, .05, 60);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 2.5; controls.maxDistance = 19; controls.maxPolarAngle = Math.PI * .49;
  controls.autoRotateSpeed = .5; controls.enablePan = false;
  const camPos = config.camera?.position ?? [6.3, 3.4, 7.3], camTarget = config.camera?.target ?? [0, .75, 0];
  function reset() { camera.position.set(...camPos); controls.target.set(...camTarget); controls.update(); dirty = true; }
  reset();
  const light = new THREE.HemisphereLight(0xffffff, 0x242a34, .25); scene.add(light);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1); keyLight.position.set(3, 7, 4); scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, .35); fillLight.position.set(-5, 3, -4); scene.add(fillLight);
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x253443, roughness: .37, metalness: .65 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.3, .12, 128), platformMaterial);
  platform.scale.set(.9, 1, .9); platform.position.y = -.06; scene.add(platform);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x91b8de });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, .009, 8, 160), ringMaterial);
  ring.scale.set(.9, .9, 1); ring.rotation.x = Math.PI / 2; ring.position.y = .006; scene.add(ring);
  const grid = new THREE.GridHelper(80, 120, 0x708295, 0x596b80); grid.position.y = -.125; scene.add(grid);
  const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const material of gridMaterials) { material.transparent = true; material.opacity = .48; }
  const walls = new THREE.Group(); scene.add(walls);
  for (const z of [-17, 17]) {
    const wall = new THREE.GridHelper(40, 60, 0x596b80, 0x596b80);
    wall.rotation.x = Math.PI / 2; wall.position.set(0, 8, z);
    const materials = Array.isArray(wall.material) ? wall.material : [wall.material];
    for (const material of materials) { material.transparent = true; material.opacity = .22; }
    walls.add(wall);
  }
  const shadow = createContactShadow(scene, renderer, glassGroups);
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const ao = new GTAOPass(scene, camera, 1, 1);
  ao.updateGtaoMaterial({ radius: .38, thickness: .12, distanceExponent: 2, scale: 1, samples: 16 });
  ao.blendIntensity = .85; composer.addPass(ao);
  const renderAO = ao.render.bind(ao);
  ao.render = (...args) => { const visible = shadow.plane.visible; shadow.plane.visible = false; try { renderAO(...args); } finally { shadow.plane.visible = visible; } };
  const output = new OutputPass(); composer.addPass(output);
  const fade = new VehicleFadePass(renderer, scene, camera, vehicle, shadow.plane); composer.addPass(fade);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const fallbackRoom = new RoomEnvironment();
  const fallback = pmrem.fromScene(fallbackRoom); fallbackRoom.dispose(); scene.environment = fallback.texture;
  const environments = new Map();
  const pendingEnvironments = new Map();
  const draco = config.dracoPath ? new DRACOLoader().setDecoderPath(config.dracoPath).setWorkerLimit(2) : null;
  const loader = new GLTFLoader(); if (draco) loader.setDRACOLoader(draco);

  function applyEnvironment(id) {
    const request = ++environmentRequest;
    keyLight.intensity = id === 'studio' ? 1.1 : .25; fillLight.intensity = id === 'studio' ? .35 : .1;
    let promise = pendingEnvironments.get(id);
    if (!promise) {
      promise = new HDRLoader().loadAsync(`${config.environmentRoot}${ENVIRONMENT_FILES[id]}`).then(texture => {
        if (disposed) { texture.dispose(); return null; }
        const environment = pmrem.fromEquirectangular(texture); texture.dispose(); environments.set(id, environment); return environment;
      }).catch(() => {
        pendingEnvironments.delete(id);
        if (!disposed && request === environmentRequest) callbacks.onError('This lighting environment could not load. The studio lighting remains available.');
        return null;
      });
      pendingEnvironments.set(id, promise);
    }
    promise.then(environment => { if (!disposed && request === environmentRequest && environment) { scene.environment = environment.texture; dirty = true; } });
  }

  function resize() {
    const width = Math.max(host.clientWidth, 1), height = Math.max(host.clientHeight, 1);
    camera.aspect = width / height; camera.clearViewOffset();
    if (width > 800) camera.setViewOffset(width, height, (90 - 280) / 2, Math.min(240 * .28, height * .09), width, height);
    else camera.setViewOffset(width, height, 0, 22, width, height);
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false); composer.setSize(width, height); dirty = true;
  }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  controls.addEventListener('change', () => { dirty = true; });

  function alignTyres(tyreMaterial) {
    const tyres = new Map();
    const v = new THREE.Vector3();
    vehicle.traverse(object => {
      if (!object.isMesh) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      if (!materials.some(material => material.name === tyreMaterial)) return;
      const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
      const position = object.geometry.getAttribute('position'); let min = Infinity;
      for (let i = 0; i < position.count; i++) min = Math.min(min, v.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld).y);
      const quadrant = `${Math.sign(center.x)},${Math.sign(center.z)}`;
      tyres.set(quadrant, Math.min(tyres.get(quadrant) ?? Infinity, min));
    });
    if (!tyres.size) return;
    const lowest = Math.min(...tyres.values()); vehicle.position.y -= lowest; vehicle.updateMatrixWorld(true);
    vehicle.traverse(object => {
      if (!object.isMesh || object.userData.studioGroup !== 'wheels') return;
      const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
      const minimum = tyres.get(`${Math.sign(center.x)},${Math.sign(center.z)}`);
      if (minimum === undefined || !object.parent) return;
      const start = object.parent.worldToLocal(center.clone());
      const end = object.parent.worldToLocal(center.clone().add(new THREE.Vector3(0, lowest - minimum, 0)));
      object.position.add(end.sub(start));
    });
    vehicle.updateMatrixWorld(true);
  }
  function collectMaterials(object, group) {
    const records = [];
    object.traverse(child => {
      if (!child.isMesh && !child.isLine) return;
      const original = Array.isArray(child.material) ? child.material : [child.material];
      const cloned = original.map(source => {
        const material = source.clone();
        resources.materials.add(source); resources.materials.add(material);
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) resources.textures.add(value);
        records.push({ material, color: material.color?.clone() ?? new THREE.Color(), metalness: material.metalness ?? 0, emissive: material.emissive?.clone() ?? new THREE.Color(), emissiveIntensity: material.emissiveIntensity ?? 0, role: child.isMesh ? config.materialRole(child, material, group) : null });
        return material;
      });
      child.material = Array.isArray(child.material) ? cloned : cloned[0];
      resources.geometries.add(child.geometry);
    });
    return records;
  }
  const load = async () => {
    try {
      const gltf = await loader.loadAsync(config.modelUrl, event => callbacks.onProgress(event.total ? Math.min(99, Math.round(event.loaded / event.total * 100)) : 0));
      if (disposed) { disposeObject(gltf.scene); return; }
      config.prepare?.(gltf);
      vehicle.add(gltf.scene); vehicle.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(vehicle), center = bounds.getCenter(new THREE.Vector3());
      vehicle.position.set(-center.x, -bounds.min.y, -center.z); vehicle.updateMatrixWorld(true);
      // Tag every node with its studio group first (needed by shadows and tyre alignment).
      const candidates = [];
      vehicle.traverse(object => {
        const isPart = config.partMode === 'assembly' ? config.isPart(object) : object.isMesh;
        if (isPart) { candidates.push(object); const group = config.groupOf(object, gltf); object.traverse(child => { child.userData.studioGroup = group; }); }
      });
      if (config.alignTyres) alignTyres(config.alignTyres);
      const counts = { all: 0 }; for (const g of config.groups) counts[g.id] = 0;
      for (const object of candidates) {
        const group = object.userData.studioGroup;
        const records = collectMaterials(object, group);
        const partCenter = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
        const worldOffset = config.partOffset(group, partCenter, object);
        const parent = object.parent;
        const offset = parent.worldToLocal(partCenter.clone().add(worldOffset)).sub(parent.worldToLocal(partCenter.clone()));
        let meshCount = 0; object.traverse(child => { if (child.isMesh) meshCount++; });
        parts.push({ mesh: object, group, center: partCenter, offset, base: object.position.clone(), materials: records });
        counts[group] = (counts[group] ?? 0) + meshCount; counts.all += meshCount;
      }
      config.afterParts?.(parts);
      for (const part of parts) part.mesh.position.copy(part.base).addScaledVector(part.offset, explosion);
      vehicle.updateMatrixWorld(true);
      ready = true; applyState(); callbacks.onProgress(100); callbacks.onReady(counts); shadowDirty = true; dirty = true;
    } catch (error) {
      if (!disposed) { console.error('Studio model load failed', error); callbacks.onError('The 3D model could not load. Please reload the model.'); }
    }
  };
  function applyState() {
    const dark = state.theme === 'dark';
    scene.background = new THREE.Color(dark ? 0x080d13 : 0xf3f4f5);
    scene.fog = new THREE.Fog(scene.background, 15, 34);
    scene.environmentIntensity = 1; scene.environmentRotation.y = THREE.MathUtils.degToRad(state.lightAngle);
    platformMaterial.color.set(dark ? 0x253443 : 0xcccccc); platformMaterial.roughness = dark ? .37 : .6; platformMaterial.metalness = dark ? .65 : .05;
    ringMaterial.color.set(dark ? 0x91b8de : 0xb9c8d4);
    for (const material of gridMaterials) material.opacity = dark ? .48 : .23;
    controls.autoRotate = state.autoRotate;
    shadow.plane.visible = state.shadows; ao.enabled = state.shadows;
    fade.amount = state.transparency / 100; fade.white = !dark; fade.enabled = fade.amount > .001;
    const paint = config.paints[state.paint] ?? config.paints[0];
    for (const part of parts) {
      part.mesh.visible = state.group === 'all' || part.group === state.group;
      for (const record of part.materials) {
        const material = record.material;
        if (material.color) material.color.copy(record.color);
        if ('metalness' in material) material.metalness = record.metalness;
        if (state.paint !== 0 && material.color) {
          if (record.role === 'body') material.color.set(paint.body);
          if (record.role === 'rim') { material.color.set(paint.wheel); material.metalness = paint.wheelMetalness ?? .72; }
          if (record.role === 'decal') { material.color.set(paint.decal); material.metalness = .2; }
        }
        if (material.emissive) {
          material.emissive.copy(record.emissive); material.emissiveIntensity = record.emissiveIntensity;
          if (state.group !== 'all' && part.group === state.group) { material.emissive.set(0x35658e); material.emissiveIntensity = .24; }
        }
      }
    }
    dirty = true; shadowDirty = true;
  }
  function update(next) {
    const environmentChanged = next.environment !== state.environment;
    state = { ...next }; applyState(); if (environmentChanged) applyEnvironment(state.environment);
  }
  function zoom(factor) {
    const vector = camera.position.clone().sub(controls.target);
    vector.setLength(THREE.MathUtils.clamp(vector.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(vector); controls.update(); dirty = true;
  }
  function key(code) {
    if (code === 'Home') return reset();
    if (code === '+' || code === '=') return zoom(.85);
    if (code === '-') return zoom(1.15);
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (code === 'ArrowLeft') spherical.theta -= .12;
    if (code === 'ArrowRight') spherical.theta += .12;
    if (code === 'ArrowUp') spherical.phi -= .08;
    if (code === 'ArrowDown') spherical.phi += .08;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi, .06, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update(); dirty = true;
  }
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster();
  let down = null;
  const pointerDown = event => { if (event.isPrimary && event.button === 0) down = { x: event.clientX, y: event.clientY, id: event.pointerId }; else down = null; };
  const pointerUp = event => {
    if (!ready || !down || down.id !== event.pointerId) return;
    const start = down; down = null; if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(parts.filter(part => part.mesh.visible).map(part => part.mesh), config.partMode === 'assembly')[0];
    if (hit) { const group = hit.object.userData.studioGroup; if (group) callbacks.onSelect(state.group === group ? 'all' : group); }
  };
  const pointerCancel = () => { down = null; };
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', pointerCancel);
  const contextLost = event => { event.preventDefault(); callbacks.onError('The browser paused the 3D display. Reload the model to continue.'); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const visibility = () => { dirty = true; lastTime = 0; }; document.addEventListener('visibilitychange', visibility);
  function animate(time) {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60; lastTime = time;
    if (document.hidden) return;
    controls.update(delta);
    const wanted = state.explosion / 100;
    if (Math.abs(wanted - explosion) > .0001) {
      explosion += (wanted - explosion) * (1 - Math.exp(-8 * delta));
      if (Math.abs(wanted - explosion) < .0001) explosion = wanted;
      for (const part of parts) part.mesh.position.copy(part.base).addScaledVector(part.offset, explosion);
      vehicle.updateMatrixWorld(true); dirty = true; shadowDirty = true;
    }
    if (ready && shadowDirty && state.shadows) { shadow.update(vehicle); shadowDirty = false; }
    if (dirty || state.autoRotate) { composer.render(delta); dirty = false; }
  }
  function disposeObject(object) {
    object.traverse(child => {
      if (!child.isMesh && !child.isLine) return;
      child.geometry.dispose();
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
  }
  applyState(); applyEnvironment(state.environment); void load(); frame = requestAnimationFrame(animate);
  return {
    update, zoom, reset, key,
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', pointerCancel); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      for (const material of resources.materials) material.dispose();
      for (const geometry of resources.geometries) geometry.dispose();
      for (const texture of resources.textures) texture.dispose();
      platform.geometry.dispose(); platformMaterial.dispose(); ring.geometry.dispose(); ringMaterial.dispose();
      grid.geometry.dispose(); gridMaterials.forEach(material => material.dispose());
      walls.traverse(object => { if (object.isLineSegments) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose()); } });
      shadow.dispose(); ao.dispose(); fade.dispose(); output.dispose(); composer.dispose();
      environments.forEach(environment => environment.dispose()); fallback.dispose(); pmrem.dispose(); draco?.dispose();
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}

/* ───────────────────────── UI ───────────────────────── */
const ICONS = {
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="21" height="21"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14M12 5v14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>',
  orbit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.341 6.484A10 10 0 0 1 10.266 21.85"/><path d="M3.659 17.516A10 10 0 0 1 13.74 2.152"/><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="19" r="2"/></svg>',
  maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>',
  minimize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="13" height="13"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M20 6 9 17l-5-5"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
  loader: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="24" height="24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
};
const escape = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * ui config: brand, title, badge, subtitle, loadingLabel, credit (HTML), exitHref, exitLabel
 */
export function mountStudio(rootEl, config) {
  const { groups: GROUPS, paints: PAINTS } = config;
  const html = String.raw;
  rootEl.innerHTML = html`
    <div class="gt3-viewport" tabindex="0" role="region" aria-label="Interactive ${escape(config.title)} 3D model. Drag to orbit, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home resets."></div>
    <header class="gt3-heading">
      <div class="gt3-wordmark">${escape(config.brand)}</div>
      <h1>${escape(config.title)} <span>${escape(config.badge)}</span></h1>
      <p>${escape(config.subtitle)}</p>
    </header>
    <div class="gt3-light-label"><span class="gt3-light-name"></span> <span>HDRI</span></div>
    <aside class="gt3-sidebar gt3-glass" aria-label="Explore parts">
      <h2>${ICONS.layers} Explore parts</h2>
      <nav class="gt3-parts"></nav>
      <div class="gt3-appearance">
        <div class="gt3-appearance-row">
          <span class="gt3-small-title">Showroom</span>
          <div class="gt3-theme-options" role="group" aria-label="Showroom colour">
            <button type="button" aria-label="Black showroom" class="gt3-theme-dark" data-theme-pick="dark">${ICONS.moon}</button>
            <button type="button" aria-label="White showroom" class="gt3-theme-light" data-theme-pick="light">${ICONS.sun}</button>
          </div>
        </div>
        <div class="gt3-appearance-row"><label for="gt3-shadows">Contact shadows</label><label class="gt3-switch"><input type="checkbox" id="gt3-shadows" /><i></i></label></div>
        <div class="gt3-paint-label">Body colour</div>
        <div class="gt3-paints" role="group" aria-label="Body colour"></div>
      </div>
    </aside>
    <section class="gt3-part-info gt3-glass" aria-live="polite" hidden><small></small><h2></h2><p></p><button type="button" data-action="show-all">Show complete vehicle</button></section>
    <div class="gt3-camera gt3-glass" role="toolbar" aria-label="View controls">
      <button type="button" title="Zoom in" aria-label="Zoom in" data-action="zoom-in">${ICONS.plus}</button>
      <button type="button" title="Zoom out" aria-label="Zoom out" data-action="zoom-out">${ICONS.minus}</button>
      <span></span>
      <button type="button" title="Reset view" aria-label="Reset view" data-action="reset">${ICONS.reset}</button>
      <button type="button" title="Auto rotate" aria-label="Auto rotate" data-action="rotate" aria-pressed="false">${ICONS.orbit}</button>
      <button type="button" title="Full screen" aria-label="Full screen" data-action="fullscreen">${ICONS.maximize}</button>
    </div>
    <section class="gt3-controls gt3-glass" aria-label="Disassembly controls">
      <div class="gt3-control-block">
        <label for="gt3-explosion">Part explosion <output data-out="explosion">0<small>%</small></output></label>
        <div class="gt3-range-row"><button type="button" data-set="explosion" data-value="0">Assembled</button><input type="range" id="gt3-explosion" class="gt3-range" aria-label="Part explosion" min="0" max="100" step="1" value="0" /><button type="button" data-set="explosion" data-value="100">Exploded</button></div>
      </div>
      <div class="gt3-control-block">
        <label for="gt3-transparency">Overall transparency <output data-out="transparency">0<small>%</small></output></label>
        <div class="gt3-range-row"><button type="button" data-set="transparency" data-value="0">Opaque</button><input type="range" id="gt3-transparency" class="gt3-range" aria-label="Overall transparency" min="0" max="100" step="1" value="0" /><button type="button" data-set="transparency" data-value="100">X-ray</button></div>
      </div>
      <div class="gt3-environment-row">
        <div class="gt3-environments" role="group" aria-label="Environment lighting"></div>
        <label for="gt3-light">Light angle</label><input type="range" id="gt3-light" class="gt3-range" aria-label="Light direction" min="0" max="360" step="1" value="54" /><output data-out="light">54°</output>
      </div>
    </section>
    <div class="gt3-loading" role="status">${ICONS.loader}<span>Loading ${escape(config.loadingLabel ?? config.title)}</span><strong>Preparing studio…</strong></div>
    <div class="gt3-error" role="alert" hidden><p></p><button type="button" data-action="reload">Reload model</button><button type="button" data-action="dismiss" hidden>Dismiss</button></div>
    <footer class="gt3-footer"><span><i></i><b class="gt3-status">LOADING MODEL</b></span><p>Drag to rotate · Scroll or pinch to zoom · Select a part</p><small>${escape(config.footnote ?? 'Visual disassembly · Not a repair guide')}</small></footer>
    <span class="gt3-credit">${ICONS.box} ${config.credit ?? ''}</span>
    <a class="gt3-exit" href="${escape(config.exitHref ?? 'petrolhead-technica.html')}" aria-label="Back to Petrolhead Technica">${escape(config.exitLabel ?? '← TECHNICA')}</a>
  `;

  const $ = sel => rootEl.querySelector(sel);
  const $$ = sel => Array.from(rootEl.querySelectorAll(sel));
  const host = $('.gt3-viewport');
  const partsNav = $('.gt3-parts');
  const paintsEl = $('.gt3-paints');
  const envsEl = $('.gt3-environments');
  const partInfo = $('.gt3-part-info');
  const loading = $('.gt3-loading');
  const errorBox = $('.gt3-error');
  const status = $('.gt3-status');
  const lightName = $('.gt3-light-name');

  let state = { ...DEFAULT_STATE, ...(config.initialState ?? {}) };
  let counts = {};
  let ready = false;
  let controller = null;
  let fullscreen = false;

  partsNav.innerHTML = GROUPS.map(g => `<button type="button" data-group="${g.id}" disabled><span><strong>${escape(g.name)}</strong><small>${escape(g.subtitle)}</small></span><span class="gt3-count" data-count="${g.id}">—</span></button>`).join('');
  paintsEl.innerHTML = PAINTS.map((p, i) => `<button type="button" data-paint="${i}" title="${escape(p.name)}" aria-label="${escape(p.name)}" style="background-color:${p.swatch ?? p.body}" disabled><span class="gt3-check" style="color:${p.checkColor ?? '#fff'}">${ICONS.check}</span></button>`).join('');
  envsEl.innerHTML = ENVIRONMENTS.map(e => `<button type="button" data-env="${e.id}" disabled>${e.name}</button>`).join('');

  function setError(message) {
    if (!message) { errorBox.hidden = true; return; }
    errorBox.querySelector('p').textContent = message;
    errorBox.querySelector('[data-action="dismiss"]').hidden = !ready;
    errorBox.hidden = false;
  }
  function setProgress(value) {
    loading.querySelector('strong').textContent = value > 0 ? `${value}%` : 'Preparing studio…';
  }
  function render() {
    rootEl.dataset.theme = state.theme;
    const current = GROUPS.find(g => g.id === state.group) || GROUPS[0];
    for (const b of $$('[data-group]')) { const on = b.dataset.group === state.group; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); b.disabled = !ready; }
    for (const [id, n] of Object.entries(counts)) { const c = rootEl.querySelector(`[data-count="${id}"]`); if (c) c.textContent = n; }
    for (const b of $$('[data-theme-pick]')) b.setAttribute('aria-pressed', String(b.dataset.themePick === state.theme));
    const sw = $('#gt3-shadows'); sw.checked = state.shadows; sw.disabled = !ready;
    for (const b of $$('[data-paint]')) { const on = Number(b.dataset.paint) === state.paint; b.setAttribute('aria-pressed', String(on)); b.disabled = !ready; b.querySelector('.gt3-check').style.display = on ? 'grid' : 'none'; }
    for (const b of $$('[data-env]')) { b.setAttribute('aria-pressed', String(b.dataset.env === state.environment)); b.disabled = !ready; }
    lightName.textContent = (ENVIRONMENTS.find(e => e.id === state.environment) || ENVIRONMENTS[0]).name;
    if (state.group !== 'all') {
      partInfo.querySelector('small').textContent = current.subtitle;
      partInfo.querySelector('h2').textContent = current.name;
      partInfo.querySelector('p').textContent = current.description;
      partInfo.hidden = false;
    } else partInfo.hidden = true;
    for (const b of $$('.gt3-camera button')) if (b.dataset.action !== 'fullscreen') b.disabled = !ready;
    $('[data-action="rotate"]').setAttribute('aria-pressed', String(state.autoRotate));
    const fs = $('[data-action="fullscreen"]');
    fs.innerHTML = fullscreen ? ICONS.minimize : ICONS.maximize;
    fs.setAttribute('aria-label', fullscreen ? 'Exit full screen' : 'Full screen');
    $('[data-out="explosion"]').innerHTML = `${state.explosion}<small>%</small>`;
    $('[data-out="transparency"]').innerHTML = `${state.transparency}<small>%</small>`;
    $('[data-out="light"]').textContent = `${state.lightAngle}°`;
    const ex = $('#gt3-explosion'), tr = $('#gt3-transparency'), li = $('#gt3-light');
    if (Number(ex.value) !== state.explosion) ex.value = state.explosion;
    if (Number(tr.value) !== state.transparency) tr.value = state.transparency;
    if (Number(li.value) !== state.lightAngle) li.value = state.lightAngle;
    ex.disabled = tr.disabled = li.disabled = !ready;
    for (const b of $$('[data-set]')) { b.disabled = !ready; b.setAttribute('aria-pressed', String(state[b.dataset.set] === Number(b.dataset.value))); }
    for (const r of $$('.gt3-range')) r.style.setProperty('--p', `${(Number(r.value) - Number(r.min)) / (Number(r.max) - Number(r.min)) * 100}%`);
    loading.hidden = ready || !errorBox.hidden;
    status.textContent = ready ? 'INTERACTIVE 3D' : 'LOADING MODEL';
  }
  function update(patch) { state = { ...state, ...patch }; controller?.update(state); render(); }

  function start() {
    controller?.dispose(); controller = null;
    ready = false; counts = {}; setError(''); setProgress(0); render();
    try {
      controller = createStudio(host, config, {
        state,
        onProgress: setProgress,
        onReady: value => { counts = value; ready = true; render(); },
        onSelect: group => update({ group }),
        onError: message => { setError(message); render(); },
      });
    } catch (e) {
      console.error(e);
      setError('The 3D studio could not start. Please try again.'); render();
    }
  }

  rootEl.addEventListener('click', event => {
    const b = event.target.closest('button'); if (!b || !rootEl.contains(b)) return;
    if (b.dataset.group) return update({ group: b.dataset.group });
    if (b.dataset.themePick) return update({ theme: b.dataset.themePick });
    if (b.dataset.paint !== undefined) return update({ paint: Number(b.dataset.paint) });
    if (b.dataset.env) return update({ environment: b.dataset.env });
    if (b.dataset.set) return update({ [b.dataset.set]: Number(b.dataset.value) });
    switch (b.dataset.action) {
      case 'show-all': return update({ group: 'all' });
      case 'zoom-in': return controller?.zoom(.84);
      case 'zoom-out': return controller?.zoom(1.19);
      case 'reset': update({ autoRotate: false }); return controller?.reset();
      case 'rotate': return update({ autoRotate: !state.autoRotate });
      case 'fullscreen': return toggleFullscreen();
      case 'reload': return start();
      case 'dismiss': setError(''); return render();
    }
  });
  $('#gt3-shadows').addEventListener('change', e => update({ shadows: e.target.checked }));
  $('#gt3-explosion').addEventListener('input', e => update({ explosion: Math.round(Number(e.target.value)) }));
  $('#gt3-transparency').addEventListener('input', e => update({ transparency: Math.round(Number(e.target.value)) }));
  $('#gt3-light').addEventListener('input', e => update({ lightAngle: Math.round(Number(e.target.value)) }));
  host.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) { event.preventDefault(); controller?.key(event.key); }
  });
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await rootEl.requestFullscreen();
    } catch { setError('Full screen is unavailable in this browser. The studio is still usable.'); render(); }
  }
  document.addEventListener('fullscreenchange', () => { fullscreen = document.fullscreenElement === rootEl; render(); });

  render();
  start();
  return { get state() { return state; }, update, get controller() { return controller; } };
}

/** Boot helper: mounts into `.gt3-studio` if WebGL is available. */
export function bootStudio(config) {
  const root = document.querySelector('.gt3-studio');
  if (!root) return null;
  const supportsWebGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (supportsWebGL) return (window.gt3Studio = mountStudio(root, config));
  root.innerHTML = '<div class="gt3-error" role="alert"><p>This browser cannot display WebGL, so the 3D studio cannot start. Try a current desktop or mobile browser with hardware acceleration enabled.</p></div>';
  return null;
}
