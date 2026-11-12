/**
 * Build the compact crew-member asset used by walk mode from two CC0 packs by
 * Quaternius (https://quaternius.com):
 *   - Universal Base Characters  -> body mesh, skeleton, skin weights
 *   - Universal Animation Library -> idle / walk / run / airborne clips
 *
 * Output: assets/worker.json (bones, clips, layout) + assets/worker.bin.
 * Only needed when the source packs change; the outputs are committed.
 *
 *   node convert-worker.mjs <Superhero_Male_FullBody.gltf> <UAL1_Standard.glb> <outDir>
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , gltfPath, glbPath, outDir] = process.argv;
const CLIPS = { Idle_Loop: 'idle', Walk_Loop: 'walk', Jog_Fwd_Loop: 'run', Jump_Loop: 'air' };

function loadGltf(p) {
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  const bufs = json.buffers.map((b) => fs.readFileSync(path.join(path.dirname(p), decodeURIComponent(b.uri))));
  return { json, bufs };
}
function loadGlb(p) {
  const b = fs.readFileSync(p);
  const jl = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jl).toString('utf8'));
  const bl = b.readUInt32LE(20 + jl);
  return { json, bufs: [b.subarray(28 + jl, 28 + jl + bl)] };
}

const SIZE = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const GET = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };
const NORM = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 };

function read({ json, bufs }, index) {
  const a = json.accessors[index];
  const v = json.bufferViews[a.bufferView];
  const n = SIZE[a.type];
  const size = BYTES[a.componentType];
  const buf = bufs[v.buffer];
  const dv = new DataView(buf.buffer, buf.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0));
  const stride = v.byteStride || size * n;
  const div = a.normalized ? NORM[a.componentType] : 1;
  const out = new Float64Array(a.count * n);
  for (let i = 0; i < a.count; i++) {
    for (let k = 0; k < n; k++) out[i * n + k] = dv[GET[a.componentType]](i * stride + k * size, true) / div;
  }
  return { data: out, count: a.count };
}

const body = loadGltf(gltfPath);
const anim = loadGlb(glbPath);
const g = body.json;
const skin = g.skins[0];
const joints = skin.joints;
const names = joints.map((j) => g.nodes[j].name);
const parentOf = new Map();
g.nodes.forEach((n, i) => (n.children || []).forEach((c) => parentOf.set(c, i)));

const bones = joints.map((j) => {
  const n = g.nodes[j];
  return {
    name: n.name,
    parent: joints.indexOf(parentOf.get(j)),
    t: n.translation || [0, 0, 0],
    r: n.rotation || [0, 0, 0, 1],
    s: n.scale || [1, 1, 1],
  };
});

// The runtime loader assumes nothing above the skeleton carries a transform.
const armature = g.nodes[parentOf.get(joints[0])];
if (armature && (armature.translation || armature.rotation || armature.scale || armature.matrix)) {
  throw new Error('Armature node has a transform: ' + JSON.stringify(armature));
}

const chunks = [];
const layout = {};
let offset = 0;
function put(name, typed, itemSize) {
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
  const b = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  layout[name] = { type: typed.constructor.name, offset, count: typed.length, itemSize };
  chunks.push(b);
  offset += b.length;
}

put('inverseBind', Float32Array.from(read(body, skin.inverseBindMatrices).data), 16);

// Per-vertex zones let the shader dress the body: how much of each vertex
// belongs to the head, the hands and the torso.
const flag = (re) => names.map((n) => re.test(n));
const HEAD = flag(/^(Head|neck_01)$/);
const HAND = flag(/^(hand|index|middle|pinky|ring|thumb)_/);
const TORSO = flag(/^(pelvis|spine_0\d|clavicle_[lr])$/);

const meshes = [];
for (const node of g.nodes) {
  if (node.mesh === undefined) continue;
  if (node.translation || node.rotation || node.scale) throw new Error('Mesh node has a transform');
  const prim = g.meshes[node.mesh].primitives[0];
  const A = prim.attributes;
  const material = g.materials[prim.material].name;
  const key = material === 'MI_Superhero_Male' ? 'body' : material === 'MI_Eyes' ? 'eyes' : 'brows';
  const pos = read(body, A.POSITION);
  const ji = read(body, A.JOINTS_0);
  const jw = read(body, A.WEIGHTS_0);
  const idx = read(body, prim.indices);
  const zone = new Uint8Array(pos.count * 4);
  for (let v = 0; v < pos.count; v++) {
    let head = 0, hand = 0, torso = 0, sum = 0;
    for (let k = 0; k < 4; k++) {
      const j = ji.data[v * 4 + k], w = jw.data[v * 4 + k];
      sum += w;
      if (HEAD[j]) head += w;
      if (HAND[j]) hand += w;
      if (TORSO[j]) torso += w;
    }
    zone.set([(head / sum) * 255, (hand / sum) * 255, (torso / sum) * 255, 0], v * 4);
  }
  put(key + '.position', Float32Array.from(pos.data), 3);
  put(key + '.normal', Float32Array.from(read(body, A.NORMAL).data), 3);
  put(key + '.uv', Float32Array.from(read(body, A.TEXCOORD_0).data), 2);
  put(key + '.skinIndex', Uint8Array.from(ji.data), 4);
  put(key + '.skinWeight', Float32Array.from(jw.data), 4);
  put(key + '.zone', zone, 4);
  put(key + '.index', Uint16Array.from(idx.data), 1);
  if (pos.count > 65535) throw new Error('Mesh too large for 16-bit indices');
  meshes.push({ key, verts: pos.count, tris: idx.count / 3 });
}

// Clips: rotations for every bone, translation for the pelvis only. Both rigs
// share bone names, so limb lengths come from the body's own rest pose.
const a = anim.json;
const clips = {};
const pelvisBody = bones[names.indexOf('pelvis')].t;
const pelvisAnim = a.nodes.find((n) => n.name === 'pelvis').translation || [0, 0, 0];
const pelvisScale = Math.hypot(...pelvisBody) / (Math.hypot(...pelvisAnim) || 1);

for (const an of a.animations) {
  const key = CLIPS[an.name];
  if (!key) continue;
  const tracks = [];
  let duration = 0;
  for (const ch of an.channels) {
    const bone = a.nodes[ch.target.node].name;
    const bi = names.indexOf(bone);
    const what = ch.target.path;
    if (bi < 0) continue;
    if (what !== 'rotation' && !(what === 'translation' && bone === 'pelvis')) continue;
    const s = an.samplers[ch.sampler];
    if (s.interpolation && s.interpolation !== 'LINEAR') throw new Error('Unsupported interpolation ' + s.interpolation);
    const times = read(anim, s.input);
    const values = Float32Array.from(read(anim, s.output).data);
    duration = Math.max(duration, times.data[times.count - 1]);
    if (what === 'translation') for (let i = 0; i < values.length; i++) values[i] *= pelvisScale;
    const id = key + '.' + bi + '.' + (what === 'rotation' ? 'q' : 'p');
    put(id + '.t', Float32Array.from(times.data), 1);
    put(id + '.v', values, what === 'rotation' ? 4 : 3);
    tracks.push({ bone: bi, path: what === 'rotation' ? 'quaternion' : 'position', id });
  }
  clips[key] = { source: an.name, duration, tracks };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'worker.bin'), Buffer.concat(chunks));
fs.writeFileSync(path.join(outDir, 'worker.json'), JSON.stringify({
  source: 'Quaternius Universal Base Characters (Superhero_Male) + Universal Animation Library, CC0 1.0',
  bones,
  clips,
  layout,
}));

console.log(JSON.stringify({
  meshes,
  bones: bones.length,
  pelvisBody,
  pelvisAnim,
  pelvisScale,
  clips: Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, { seconds: +c.duration.toFixed(2), tracks: c.tracks.length }])),
  binBytes: offset,
  root: bones[0],
}, null, 1));
