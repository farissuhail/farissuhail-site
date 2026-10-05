/* ==========================================================================
   PETROLHEAD TECHNICA — engine geometry kit
   --------------------------------------------------------------------------
   Shared construction helpers and materials for every engine builder
   (engine-vr6.js, engine-inline4.js, engine-flat6.js).

   Provenance: authored procedurally for this site. Nothing here is
   manufacturer CAD, a scan or a third-party model.

   Units. Builders author in "model units": 1 unit = UNIT metres (0.26 m).
   A builder returns a root group already scaled by UNIT, so everything the
   viewer sees is in metres. Explosion offsets are therefore metric.

   Surface detail is procedural and kept FINER than the mechanical detail:
   smooth multi-octave grain, never blocky noise or photographic textures.
   ========================================================================== */
import * as THREE from 'three';

export const UNIT = 0.26;
const PI = Math.PI;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ───────────────────────── procedural surface maps ───────────────────────── */
function surfaceTextures(role) {
  const N = 256;
  const color = new Uint8Array(N * N * 4), grain = new Uint8Array(N * N * 4), rough = new Uint8Array(N * N * 4);
  const noise = (x, y, salt = 0) => {
    let n = Math.imul(x + salt * 79, 374761393) + Math.imul(y + salt * 151, 668265263);
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967295;
  };
  const smooth = (u, v, cells, salt) => {
    const xx = u * cells, yy = v * cells, x = Math.floor(xx), y = Math.floor(yy);
    const fx = xx - x, fy = yy - y, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = noise(x % cells, y % cells, salt), b = noise((x + 1) % cells, y % cells, salt);
    const c = noise(x % cells, (y + 1) % cells, salt), d = noise((x + 1) % cells, (y + 1) % cells, salt);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4, u = x / N, v = y / N;
    const fine = noise(x, y, 2), micro = smooth(u, v, 64, 3), medium = smooth(u, v, 24, 8), broad = smooth(u, v, 6, 13);
    const oxide = Math.max(0, smooth(u, v, 12, 21) - 0.67) * 1.2;
    let tone, height, roughness;
    if (role === 'aluminium') {
      tone = 214 + broad * 4 + medium * 4 + fine * 7 - oxide * 18;
      height = 116 + fine * 22 + micro * 12 + medium * 3;
      roughness = 176 + broad * 12 + medium * 14 + oxide * 24;
    } else if (role === 'iron') {
      tone = 212 + broad * 4 + medium * 5 + fine * 7;
      height = 105 + fine * 29 + micro * 17 + medium * 5;
      roughness = 200 + broad * 22 + medium * 17;
    } else if (role === 'steel') {
      const m = Math.sin(u * PI * 174 + medium * 0.8);
      tone = 225 + broad * 6 + m * 5 + fine * 4 - oxide * 17;
      height = 125 + m * 5 + fine * 4;
      roughness = 142 + broad * 31 + m * 9 + oxide * 27;
    } else {
      tone = 217 + broad * 14 + medium * 8 + fine * 4;
      height = 123 + micro * 7 + fine * 6;
      roughness = 218 + broad * 19 + medium * 8;
    }
    const t = Math.round(THREE.MathUtils.clamp(tone, 0, 255));
    const al = role === 'aluminium';
    color[i] = t; color[i + 1] = Math.min(255, t + (al ? 2 : 0)); color[i + 2] = Math.min(255, t + (al ? 3 : 0)); color[i + 3] = 255;
    grain[i] = grain[i + 1] = grain[i + 2] = Math.round(height); grain[i + 3] = 255;
    rough[i] = rough[i + 1] = rough[i + 2] = Math.round(THREE.MathUtils.clamp(roughness, 0, 255)); rough[i + 3] = 255;
  }
  const tex = (data, srgb) => {
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
    t.anisotropy = 4;
    t.repeat.set(3, 3);                 // grain stays finer than the mechanical detail
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  return { map: tex(color, true), bumpMap: tex(grain, false), roughnessMap: tex(rough, false) };
}

/** Material roles shared by all engines. `tint` lets a car shift colours
    (the N20 has darker magnesium-look covers, the GT3 RS a bare satin head). */
export function makeMaterials(prefix = 'Engine') {
  const cast = surfaceTextures('aluminium'), iron = surfaceTextures('iron'),
        steel = surfaceTextures('steel'), rubber = surfaceTextures('rubber');
  const S = o => new THREE.MeshStandardMaterial(o);
  const mat = {
    cast:      S({ color: 0xa9afb0, metalness: 0.76, roughness: 0.73, ...cast, bumpScale: 0.0036 }),
    castLight: S({ color: 0xc5cbca, metalness: 0.74, roughness: 0.67, ...cast, bumpScale: 0.0026 }),
    castDark:  S({ color: 0x2d3435, metalness: 0.21, roughness: 0.83, ...iron, bumpScale: 0.0039 }),
    edge:      S({ color: 0xc4cbc9, metalness: 0.93, roughness: 0.42, ...steel, bumpScale: 0.0007 }),
    steel:     S({ color: 0x798287, metalness: 0.92, roughness: 0.49, ...steel, bumpScale: 0.0008 }),
    zinc:      S({ color: 0xb0b2a6, metalness: 0.87, roughness: 0.58, ...steel, bumpScale: 0.0006 }),
    black:     S({ color: 0x252b2e, metalness: 0.17, roughness: 0.78, ...iron, bumpScale: 0.0014 }),
    rubber:    S({ color: 0x161a1c, metalness: 0, roughness: 0.94, ...rubber, bumpScale: 0.0018 }),
    plastic:   S({ color: 0x252a2a, metalness: 0.02, roughness: 0.77, ...rubber, bumpScale: 0.0008 }),
    red:       S({ color: 0xc92630, metalness: 0.04, roughness: 0.47 }),
    redSleeve: S({ color: 0xaf2230, metalness: 0.03, roughness: 0.68 }),
    brass:     S({ color: 0xb9a982, metalness: 0.82, roughness: 0.42 }),
    exhaust:   S({ color: 0x827465, metalness: 0.72, roughness: 0.59 }),
    copper:    S({ color: 0xa66c49, metalness: 0.78, roughness: 0.4 }),
    recess:    S({ color: 0x303533, metalness: 0.25, roughness: 0.91 }),
    dipstick:  S({ color: 0xd7a329, metalness: 0.03, roughness: 0.52 }),
    oxide:     S({ color: 0x98998d, metalness: 0.49, roughness: 0.87, ...cast, bumpScale: 0.0025 }),
    gasket:    S({ color: 0x171b1c, metalness: 0, roughness: 0.96, ...rubber, bumpScale: 0.0011 }),
    blue:      S({ color: 0x2f5fa8, metalness: 0.05, roughness: 0.5 }),
    orange:    S({ color: 0xd4762f, metalness: 0.05, roughness: 0.5 }),
    fin:       S({ color: 0xc6ced4, metalness: 0.7, roughness: 0.45 }),
    titanium:  S({ color: 0x8e8b86, metalness: 0.9, roughness: 0.38 }),
  };
  for (const [role, m] of Object.entries(mat)) { m.name = `${prefix} ${role}`; m.userData.materialRole = role; }
  const textures = [cast, iron, steel, rubber].flatMap(t => Object.values(t));
  return { mat, textures };
}

/* ───────────────────────── the kit ───────────────────────── */
export function createKit(mat) {
  const cache = {};
  const geometries = new Set();
  const track = g => { geometries.add(g); return g; };

  const add = (parent, geo, material, xyz = [0, 0, 0], rot = [0, 0, 0]) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(...xyz); m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const cached = (key, make) => (cache[key] ||= track(make()));

  const box = (parent, size, material, xyz, rot) =>
    add(parent, cached('b' + size.join(':'), () => new THREE.BoxGeometry(...size)), material, xyz, rot);

  const rounded = (parent, size, material, xyz, rot, r = 0.06) => {
    const [w, h, d] = size;
    const g = cached('r' + size.join(':') + ':' + r, () => {
      const radius = Math.min(r, w / 5, h / 3), b = Math.min(radius * 0.4, d / 5), s = new THREE.Shape();
      const x = -w / 2, y = -h / 2;
      s.moveTo(x + radius, y); s.lineTo(x + w - radius, y); s.quadraticCurveTo(x + w, y, x + w, y + radius);
      s.lineTo(x + w, y + h - radius); s.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      s.lineTo(x + radius, y + h); s.quadraticCurveTo(x, y + h, x, y + h - radius);
      s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y);
      const e = new THREE.ExtrudeGeometry(s, { depth: d - b * 2, bevelEnabled: true, bevelSize: b, bevelThickness: b, bevelSegments: 3, curveSegments: 8, steps: 1 });
      e.translate(0, 0, -d / 2 + b); e.computeVertexNormals();
      return e;
    });
    return add(parent, g, material, xyz, rot);
  };

  const cyl = (parent, radius, length, material, xyz, axis = 'y', segments = 32, radiusTop) =>
    add(parent,
      cached(['c', radius, length, radiusTop ?? radius, segments].join(':'),
        () => new THREE.CylinderGeometry(radiusTop ?? radius, radius, length, segments)),
      material, xyz, axis === 'x' ? [0, 0, PI / 2] : axis === 'z' ? [PI / 2, 0, 0] : [0, 0, 0]);

  const ring = (parent, radius, width, material, xyz, axis = 'z') =>
    add(parent, cached(['t', radius, width].join(':'), () => new THREE.TorusGeometry(radius, width, 10, 48)),
      material, xyz, axis === 'x' ? [0, PI / 2, 0] : axis === 'y' ? [PI / 2, 0, 0] : [0, 0, 0]);

  /** Hex head with a recessed centre: two single-material meshes in a group, so
      highlighting, cloning and merging never meet a material array. */
  const bolt = (parent, xyz, axis = 'y', scale = 1) => {
    const g = new THREE.Group();
    g.position.set(...xyz);
    if (axis === 'x') g.rotation.set(0, 0, -PI / 2); else if (axis === '-x') g.rotation.set(0, 0, PI / 2); else if (axis === 'z') g.rotation.set(PI / 2, 0, 0);
    add(g, cached('boltHead:' + scale, () => new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.021 * scale, 6)), mat.zinc);
    add(g, cached('boltRecess:' + scale, () => {
      const r = new THREE.CylinderGeometry(0.012 * scale, 0.012 * scale, 0.003 * scale, 6);
      r.translate(0, 0.013 * scale, 0);
      return r;
    }), mat.recess);
    parent.add(g);
    return g;
  };

  const ellipsoid = (parent, scale, material, xyz, rot) => {
    const m = add(parent, cached('sphere', () => new THREE.SphereGeometry(1, 40, 24)), material, xyz, rot);
    m.scale.set(...scale);
    return m;
  };

  /** Extruded polygon with optional holes; centred on its depth. */
  const profile = (parent, points, depth, material, xyz, holes = [], bevel = 0.035, steps = 1) => {
    const s = new THREE.Shape();
    s.moveTo(...points[0]);
    for (const p of points.slice(1)) s.lineTo(...p);
    s.closePath();
    for (const hole of holes) {
      const [x, y, r] = hole, h = new THREE.Path();
      if (hole.length > 3) h.absellipse(x, y, r, hole[3], 0, PI * 2, true, hole[4] || 0);
      else h.absarc(x, y, r, 0, PI * 2, true);
      s.holes.push(h);
    }
    const g = track(new THREE.ExtrudeGeometry(s, {
      depth: Math.max(0.008, depth - bevel * 2), bevelEnabled: bevel > 0, bevelSize: bevel,
      bevelThickness: bevel, bevelSegments: 3, curveSegments: 10, steps,
    }));
    g.translate(0, 0, -depth / 2 + bevel); g.computeVertexNormals();
    return add(parent, g, material, xyz);
  };

  /** Lathed solid of revolution about Y, profile as [radius, y] pairs. */
  const lathe = (parent, pts, material, xyz, rot, seg = 40) => {
    const g = track(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), seg));
    g.computeVertexNormals();
    return add(parent, g, material, xyz, rot);
  };

  /** Swept section along a curve: round hoses, rectangular cast ducts, belts.
      Triangle winding is built so normals face outward (verified in tests). */
  const sweep = (parent, points, a, b, material, options = {}) => {
    const curve = options.curve || new THREE.CatmullRomCurve3(points.map(p => V3(...p)), false, 'catmullrom', 0.5);
    const steps = options.steps || 56, sides = options.sides || 20;
    const frames = curve.computeFrenetFrames(steps, false);
    const verts = [], uvs = [], idx = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = curve.getPointAt(t), tangent = curve.getTangentAt(t);
      const normal = options.planar ? V3(-tangent.y, tangent.x, 0).normalize() : frames.normals[i];
      const binormal = options.planar ? V3(0, 0, 1) : frames.binormals[i];
      const bulge = options.bulge ? 0.76 + Math.sin(PI * t) * options.bulge : 1;
      const corr = options.corrugate ? 1 + Math.cos(t * PI * 2 * options.corrugate) * 0.115 : 1;
      for (let j = 0; j <= sides; j++) {
        const ang = j / sides * PI * 2, c = Math.cos(ang), s = Math.sin(ang);
        const ca = options.rectangular ? Math.sign(c) * Math.pow(Math.abs(c), 0.42) : c;
        const cb = options.rectangular ? Math.sign(s) * Math.pow(Math.abs(s), 0.42) : s;
        const v = p.clone().addScaledVector(normal, ca * a * bulge * corr).addScaledVector(binormal, cb * b * bulge * corr);
        verts.push(v.x, v.y, v.z); uvs.push(j / sides, t);
        if (i < steps && j < sides) {
          const k = i * (sides + 1) + j;
          idx.push(k, k + 1, k + sides + 1, k + 1, k + sides + 2, k + sides + 1);
        }
      }
    }
    if (!options.open) for (const end of [0, steps]) {
      const c = curve.getPointAt(end / steps), ci = verts.length / 3;
      verts.push(c.x, c.y, c.z); uvs.push(0.5, 0.5);
      for (let j = 0; j < sides; j++) {
        const a0 = end * (sides + 1) + j;
        if (!end) idx.push(ci, a0 + 1, a0); else idx.push(ci, a0, a0 + 1);
      }
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const mesh = add(parent, g, material);
    mesh.userData.sweep = { steps, sides, start: curve.getPointAt(0).toArray(), end: curve.getPointAt(1).toArray(), open: !!options.open };
    return mesh;
  };

  const hose = (parent, points, radius, corrugate = 0, material = mat.rubber) =>
    sweep(parent, points, radius, radius, material, { corrugate, steps: corrugate ? Math.max(80, corrugate * 6) : 44, sides: 12, open: true });

  /** Band clamp whose axis is the joint axis, with its screw housing on the outside. */
  const clamp = (parent, xyz, tangent, radius, rotation = 0) => {
    const axis = V3(...tangent).normalize();
    const band = add(parent, new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, 0.028, 40, 1, true), mat.zinc, xyz);
    band.material = mat.zinc;
    band.quaternion.setFromUnitVectors(V3(0, 1, 0), axis);
    band.userData.hoseClampAxis = axis.toArray();
    const across = V3(0, 0, 1);
    if (Math.abs(axis.dot(across)) > 0.94) across.set(1, 0, 0);
    across.cross(axis).normalize().applyAxisAngle(axis, rotation);
    const sp = V3(...xyz).addScaledVector(across, radius + 0.014);
    const housing = rounded(parent, [0.049, 0.024, 0.027], mat.steel, sp.toArray(), undefined, 0.007);
    housing.quaternion.copy(band.quaternion);
    const screw = cyl(parent, 0.009, 0.041, mat.zinc, sp.toArray(), 'y', 14);
    screw.quaternion.setFromUnitVectors(V3(0, 1, 0), axis);
    return band;
  };

  return {
    mat, add, box, rounded, cyl, ring, bolt, ellipsoid, profile, lathe, sweep, hose, clamp, cache,
    disposeGeometry() { geometries.forEach(g => g.dispose()); geometries.clear(); },
  };
}

/* ───────────────────────── cooling ports ───────────────────────── */
/** A visible port: an open spigot with a lip, remembered so tests can prove
    every hose end lands on one. `external` marks the vehicle-side connection
    (radiator, expansion tank, air duct) that is deliberately not modelled. */
export function makePortFactory(kit, root) {
  const { mat, add, ring } = kit;
  const ports = [], connections = [];

  function port(id, label, xyz, direction, radius, parent, support, external = false) {
    const p = V3(...xyz), axis = V3(...direction).normalize(), depth = 0.12;
    const m = add(parent, new THREE.CylinderGeometry(radius, radius, depth, 36, 1, true),
      external ? mat.black : mat.cast, p.clone().addScaledVector(axis, -depth / 2).toArray());
    m.quaternion.setFromUnitVectors(V3(0, 1, 0), axis);
    m.name = label;
    const lip = ring(parent, radius + 0.003, 0.006, external ? mat.zinc : mat.cast, p.toArray(), 'y');
    lip.quaternion.setFromUnitVectors(V3(0, 0, 1), axis);
    const rec = {
      id, label, position: p.toArray(), axis: axis.toArray(), radius, external,
      insertionDepth: depth, support: support?.uuid || null, mesh: m, lip,
    };
    m.userData.coolingPortId = id; m.userData.externalConnector = external;
    m.userData.coolingJoint = { id, position: p.toArray(), axis: axis.toArray(), radius, insertionDepth: depth, external };
    ports.push(rec);
    return rec;
  }

  /** Hose or rigid pipe between two ports, leaving each along its own axis,
      with a clamp aligned to the joint axis at each end. */
  function connect(parent, id, from, to, bends, radius, rigid = false) {
    const p = V3(...from.position), q = V3(...to.position);
    const a = V3(...from.axis), b = V3(...to.axis);
    let m;
    if (rigid) {
      const run = [p.toArray(), p.clone().addScaledVector(a, 0.065).toArray(), ...bends, q.clone().addScaledVector(b, 0.065).toArray(), q.toArray()];
      m = kit.hose(parent, run, radius, 0, mat.steel);
    } else {
      const handle = Math.max(radius * 1.8, p.distanceTo(q) * 0.46);
      const curve = new THREE.CubicBezierCurve3(p, p.clone().addScaledVector(a, handle), q.clone().addScaledVector(b, handle), q);
      m = kit.sweep(parent, [], radius, radius, mat.rubber, { curve, steps: 64, sides: 12, open: true });
    }
    m.name = id; m.userData.coolingConnectionId = id;
    for (const [pt, ax] of [[p, a], [q, b]]) kit.clamp(parent, pt.clone().addScaledVector(ax, 0.026).toArray(), ax.toArray(), radius, 0.24);
    connections.push({ id, from: from.id, to: to.id, radius, rigid, start: p.toArray(), end: q.toArray() });
    return m;
  }

  return {
    port, connect,
    /** Serialisable network, for tests and the component panel. */
    network(external) {
      return {
        illustrative: true, externalComponents: external,
        ports: ports.map(({ mesh, lip, support, ...r }) => r),
        connections,
      };
    },
  };
}

/** Finish a builder: stamp assembly ids on every mesh, scale to metres. */
export function finishEngine(root, parts, extras = {}) {
  root.scale.setScalar(UNIT);
  root.updateMatrixWorld(true);
  for (const [id, obj] of parts) {
    obj.userData.componentId = id;
  }
  return { group: root, parts, ...extras };
}
