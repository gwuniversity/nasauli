/**
 * Hero illustration, 3D: delivery drones from three operator fleets fly lanes between rooftop
 * vertiports above a city. Every cycle one drone starts broadcasting a false Remote ID position;
 * the system localizes it, marks an unsafe region, and nearby traffic climbs and steers around it.
 *
 * Same story, status callbacks, and flight-zone contract as the 2D version (./airspace.ts), which
 * remains the fallback when WebGL is unavailable. Labels are drawn on a separate 2D overlay canvas
 * so text stays crisp at any camera angle.
 */
import * as THREE from 'three';
import type { AirspaceStatus, Phase, Zone } from './airspace';

const PHASES: { phase: Phase; duration: number }[] = [
  { phase: 'nominal', duration: 3.4 },
  { phase: 'spoofing', duration: 2.8 },
  { phase: 'detected', duration: 4.6 },
  { phase: 'recovering', duration: 1.1 },
];
const CYCLE = PHASES.reduce((n, p) => n + p.duration, 0);
const FLEET_CODES = ['OP-A', 'OP-B', 'OP-C'];
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

// World units: city blocks are 4 units wide; the flight area spans about 26 units.
const BLOCK = 4;
const STREET = 1.3;
const CITY_HALF = 46;
const FLY_R = 12.5;
const LANES = [8.2, 9.3, 10.4];
const GHOST_DIST = 3.4;
const AVOID_R = 6.5;
const UNSAFE_R = 2.8;
// Separation keeping (world units). Vertical distance is weighted, so the fleets' different
// altitude lanes count as separation, as in layered airspace.
const SEP_LOOKAHEAD = 4.6;
const SEP_MIN = 1.7;
const SEP_VERTICAL_WEIGHT = 3;

type V3 = THREE.Vector3;

interface Pad {
  pos: V3;
}

interface Drone {
  id: number;
  fleet: number;
  pos: V3;
  offset: V3;
  heading: number;
  speed: number;
  alt: number;
  target: number;
  mode: 'climb' | 'cruise' | 'descend' | 'dwell';
  dwell: number;
  pulse: number;
  labeled: boolean;
  group: THREE.Group;
  rotors: THREE.Object3D[];
  ring: THREE.Mesh;
  shadow: THREE.Mesh;
  trail: THREE.Line;
  trailPts: V3[];
  trailClock: number;
  /** Speed multiplier from separation keeping (1 = unconstrained). */
  sep: number;
  yieldTo: number | null;
  sepRing: THREE.Line;
  sepLink: THREE.Line;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Resolve any CSS color (hex, rgb(), modern space syntax) into a THREE color plus alpha. */
const probe = document.createElement('canvas').getContext('2d')!;
function css(color: string): { c: THREE.Color; a: number } {
  probe.fillStyle = '#000';
  probe.fillStyle = color || '#000';
  const v = probe.fillStyle as string;
  if (v.startsWith('#')) return { c: new THREE.Color(v), a: 1 };
  const m = v.match(/rgba?\(([^)]+)\)/);
  const parts = m ? m[1].split(/[\s,/]+/).filter(Boolean).map(Number) : [0, 0, 0, 1];
  return { c: new THREE.Color(parts[0] / 255, parts[1] / 255, parts[2] / 255), a: parts[3] ?? 1 };
}

function tokens() {
  const s = getComputedStyle(document.documentElement);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    dark: document.documentElement.dataset.theme === 'dark',
    bg: v('--bg'),
    raised: v('--bg-raised'),
    sunken: v('--bg-sunken'),
    line: v('--line'),
    lineStrong: v('--line-strong'),
    ink: v('--ink'),
    label: v('--ink-3'),
    secure: v('--accent-graphic'),
    threat: v('--signal-graphic'),
    fleets: [v('--fleet-a'), v('--fleet-b'), v('--fleet-c')],
  };
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function startAirspace3D(
  canvas: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
  onStatus: (status: AirspaceStatus) => void,
  getZone?: (width: number, height: number) => Zone,
  /** Called when the number of aircraft actively keeping separation changes. */
  onSeparation?: (active: number) => void,
) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  const octx = overlay.getContext('2d')!;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 400);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rand = mulberry32(20241001);

  let t = tokens();
  let width = 1;
  let height = 1;
  let zone: Zone = { x: 0, y: 0, w: 1, h: 1 };
  let clock = 0;
  let cycleIndex = -1;
  let lastPhase: Phase | null = null;
  let spoofer: Drone | null = null;
  let ghostDir = new THREE.Vector3(1, 0, 0);
  let frame = 0;
  let last = 0;
  let visible = true;
  let camDist = 70;
  const col = { threat: new THREE.Color(), fleets: [new THREE.Color(), new THREE.Color(), new THREE.Color()] };

  // ---------- Materials (recolored on theme change) ----------
  const mat = {
    ground: new THREE.MeshLambertMaterial(),
    building: new THREE.MeshLambertMaterial(),
    edges: new THREE.LineBasicMaterial({ transparent: true }),
    grid: new THREE.LineBasicMaterial({ transparent: true }),
    pad: new THREE.MeshBasicMaterial(),
    padMark: new THREE.MeshBasicMaterial({ transparent: true }),
    padRing: new THREE.LineBasicMaterial({ transparent: true }),
    fleets: [0, 1, 2].map(() => new THREE.MeshLambertMaterial()),
    trails: [0, 1, 2].map(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.28 })),
    rings: [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false })),
    rotor: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false }),
    parcel: new THREE.MeshLambertMaterial(),
    shadow: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    threat: new THREE.MeshBasicMaterial({ transparent: true, wireframe: false }),
    threatRing: new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    threatLine: new THREE.LineDashedMaterial({ dashSize: 0.35, gapSize: 0.3, transparent: true }),
    secureFill: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }),
    secureLine: new THREE.LineDashedMaterial({ dashSize: 0.5, gapSize: 0.35, transparent: true }),
    sepRings: [0, 1, 2].map(() => new THREE.LineDashedMaterial({ dashSize: 0.18, gapSize: 0.16, transparent: true })),
    sepLink: new THREE.LineDashedMaterial({ dashSize: 0.08, gapSize: 0.16, transparent: true }),
  };

  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.position.set(-40, 55, -10);
  scene.add(hemi, sun);

  function applyTheme() {
    t = tokens();
    const bg = css(t.bg).c;
    renderer.setClearColor(bg, 1);
    scene.fog = new THREE.Fog(bg, camDist * 0.85, camDist * 1.9);
    if (t.dark) {
      mat.ground.color.copy(css(t.bg).c).lerp(new THREE.Color('#000'), 0.15);
      mat.building.color.copy(css(t.raised).c).lerp(new THREE.Color('#22324f'), 0.45);
      hemi.color.set('#9fb3d1');
      hemi.groundColor.set('#0a0f19');
      hemi.intensity = 1.25;
      sun.intensity = 0.9;
    } else {
      mat.ground.color.copy(css(t.sunken).c);
      mat.building.color.copy(css(t.raised).c).lerp(css(t.lineStrong).c, 0.08);
      hemi.color.set('#ffffff');
      hemi.groundColor.set('#b9b2a2');
      hemi.intensity = 1.7;
      sun.intensity = 1.35;
    }
    const edge = css(t.dark ? t.lineStrong : t.lineStrong);
    mat.edges.color.copy(edge.c);
    mat.edges.opacity = t.dark ? 0.9 : 0.75;
    mat.grid.color.copy(css(t.lineStrong).c);
    mat.grid.opacity = t.dark ? 0.35 : 0.4;
    mat.pad.color.copy(css(t.raised).c);
    mat.padMark.color.copy(css(t.ink).c);
    mat.padMark.opacity = t.dark ? 0.75 : 0.65;
    mat.padRing.color.copy(css(t.ink).c);
    mat.padRing.opacity = 0.35;
    t.fleets.forEach((f, i) => {
      const c = css(f).c;
      mat.fleets[i].color.copy(c);
      mat.fleets[i].emissive.copy(c).multiplyScalar(t.dark ? 0.45 : 0.12);
      mat.trails[i].color.copy(c);
      mat.rings[i].color.copy(c);
      mat.sepRings[i].color.copy(c);
    });
    mat.rotor.color.copy(css(t.ink).c);
    mat.sepLink.color.copy(css(t.label).c);
    mat.parcel.color.set(t.dark ? '#c9b48f' : '#b89a6a');
    mat.shadow.color.set(t.dark ? '#000000' : '#0d1626');
    mat.shadow.opacity = t.dark ? 0.35 : 0.12;
    col.threat.copy(css(t.threat).c);
    t.fleets.forEach((f, i) => col.fleets[i].copy(css(f).c));
    const threat = css(t.threat).c;
    const secure = css(t.secure).c;
    mat.threat.color.copy(threat);
    mat.threatRing.color.copy(threat);
    mat.threatLine.color.copy(threat);
    mat.secureFill.color.copy(secure);
    mat.secureLine.color.copy(secure);
  }

  // ---------- City ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 4, CITY_HALF * 4), mat.ground);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(CITY_HALF * 2, (CITY_HALF * 2) / (BLOCK + STREET), 0xffffff, 0xffffff);
  (grid.material as THREE.Material).dispose();
  grid.material = mat.grid;
  grid.position.y = 0.01;
  scene.add(grid);

  // Lots on a regular grid; heights rise toward downtown but stay under the flight lanes.
  const pitch = BLOCK + STREET;
  const lots: { x: number; z: number; w: number; d: number; h: number }[] = [];
  for (let gx = -CITY_HALF; gx <= CITY_HALF; gx += pitch) {
    for (let gz = -CITY_HALF; gz <= CITY_HALF; gz += pitch) {
      const r = Math.hypot(gx, gz);
      // Some lots are parks or plazas, which opens the skyline and shows the street grid.
      if (rand() < 0.14) continue;
      const split = rand() < 0.5;
      const parts = split ? 2 : 1;
      for (let i = 0; i < parts; i++) {
        const w = split ? BLOCK / 2 - 0.35 : BLOCK - 0.5 - rand() * 0.9;
        const d = BLOCK - 0.5 - rand() * 1.2;
        const x = split ? gx - BLOCK / 4 + i * (BLOCK / 2) : gx;
        const downtown = Math.exp(-(r * r) / (2 * 13 * 13));
        // Mostly low-rise, with a few towers downtown.
        const tower = rand() < 0.18 + downtown * 0.35;
        const h = Math.min(6.4, 0.4 + rand() * 1.4 + (tower ? 1.5 + rand() * 3.6 * (0.4 + downtown) : 0));
        lots.push({ x, z: gz, w, d, h });
      }
    }
  }

  // Vertiports: rooftops spread over the flight area (corners, edges, center, in-betweens).
  const anchors: [number, number][] = [
    [0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0],
    [-0.5, -0.5], [0.5, 0.5],
  ];
  const pads: Pad[] = [];
  const padLots = new Set<number>();
  for (const [ax, az] of anchors) {
    const wx = ax * FLY_R;
    const wz = az * FLY_R;
    let best = -1;
    let bestD = Infinity;
    lots.forEach((l, i) => {
      if (padLots.has(i) || l.w < 1.6) return;
      const dd = Math.hypot(l.x - wx, l.z - wz);
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    });
    if (best < 0) continue;
    padLots.add(best);
    const l = lots[best];
    l.h = 1.6 + rand() * 3.2;
    pads.push({ pos: new THREE.Vector3(l.x, l.h + 0.02, l.z) });
  }

  // Buildings: one instanced mesh plus one merged edge set.
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const buildings = new THREE.InstancedMesh(box, mat.building, lots.length);
  const m4 = new THREE.Matrix4();
  const edgeVerts: number[] = [];
  const corners = [
    [-0.5, 0, -0.5], [0.5, 0, -0.5], [0.5, 0, 0.5], [-0.5, 0, 0.5],
    [-0.5, 1, -0.5], [0.5, 1, -0.5], [0.5, 1, 0.5], [-0.5, 1, 0.5],
  ];
  const edgePairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  lots.forEach((l, i) => {
    m4.compose(new THREE.Vector3(l.x, 0, l.z), new THREE.Quaternion(), new THREE.Vector3(l.w, l.h, l.d));
    buildings.setMatrixAt(i, m4);
    // Slight per-building tone variation so the city doesn't read as identical blocks.
    buildings.setColorAt(i, new THREE.Color().setScalar(0.86 + rand() * 0.14));
    for (const [a, b] of edgePairs) {
      for (const k of [a, b]) {
        const [cx, cy, cz] = corners[k];
        edgeVerts.push(l.x + cx * l.w, cy * l.h, l.z + cz * l.d);
      }
    }
  });
  scene.add(buildings);
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
  scene.add(new THREE.LineSegments(edgeGeo, mat.edges));

  // Pads: disc, dashed safety ring, and an "H".
  const padGroup = new THREE.Group();
  const ringPts = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25);
  });
  for (const p of pads) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), mat.pad);
    disc.rotation.x = -Math.PI / 2;
    disc.position.copy(p.pos);
    const outline = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 40), mat.padMark);
    outline.rotation.x = -Math.PI / 2;
    outline.position.copy(p.pos).add(new THREE.Vector3(0, 0.005, 0));
    const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts), mat.padRing);
    ring.position.copy(p.pos);
    const h = new THREE.Group();
    const bar = (w: number, d: number, x: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat.padMark);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.01, 0);
      h.add(m);
    };
    bar(0.11, 0.85, -0.3);
    bar(0.11, 0.85, 0.3);
    bar(0.6, 0.11, 0);
    h.position.copy(p.pos);
    padGroup.add(disc, outline, ring, h);
  }
  scene.add(padGroup);

  // ---------- Drones ----------
  const bodyGeo = new THREE.BoxGeometry(0.42, 0.14, 0.42);
  const armGeo = new THREE.BoxGeometry(1.15, 0.05, 0.07);
  const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.012, 20);
  const bladeGeo = new THREE.BoxGeometry(0.46, 0.015, 0.05);
  const parcelGeo = new THREE.BoxGeometry(0.24, 0.2, 0.24);
  const noseGeo = new THREE.ConeGeometry(0.08, 0.22, 8);
  const ringGeo = new THREE.RingGeometry(0.96, 1, 48);
  const shadowGeo = new THREE.CircleGeometry(0.5, 20);
  const arm = 0.41;

  function buildDrone(material: THREE.Material, solid: boolean) {
    const g = new THREE.Group();
    const rotors: THREE.Object3D[] = [];
    g.add(new THREE.Mesh(bodyGeo, material));
    for (const a of [Math.PI / 4, -Math.PI / 4]) {
      const m = new THREE.Mesh(armGeo, material);
      m.rotation.y = a;
      g.add(m);
    }
    for (const [x, z] of [[arm, arm], [-arm, arm], [arm, -arm], [-arm, -arm]]) {
      const disc = new THREE.Mesh(rotorGeo, solid ? mat.rotor : material);
      disc.position.set(x, 0.06, z);
      g.add(disc);
      const blade = new THREE.Mesh(bladeGeo, material);
      blade.position.set(x, 0.075, z);
      g.add(blade);
      rotors.push(blade);
    }
    const nose = new THREE.Mesh(noseGeo, material);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.34, 0, 0);
    g.add(nose);
    if (solid) {
      const parcel = new THREE.Mesh(parcelGeo, mat.parcel);
      parcel.position.y = -0.19;
      g.add(parcel);
    }
    g.scale.setScalar(1.25);
    return { g, rotors };
  }

  const sepRingGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * SEP_MIN * 0.9, 0, Math.sin(a) * SEP_MIN * 0.9);
    }),
  );
  const drones: Drone[] = [];
  function spawnDrones(count: number) {
    for (const d of drones) {
      scene.remove(d.group, d.ring, d.shadow, d.trail, d.sepRing, d.sepLink);
      d.trail.geometry.dispose();
      d.sepLink.geometry.dispose();
    }
    drones.length = 0;
    for (let id = 0; id < count; id++) {
      const fleet = id % 3;
      const { g, rotors } = buildDrone(mat.fleets[fleet], true);
      const from = pads[Math.floor(rand() * pads.length)].pos;
      const target = Math.floor(rand() * pads.length);
      const to = pads[target].pos;
      const k = rand();
      const alt = LANES[fleet];
      const pos = new THREE.Vector3(from.x + (to.x - from.x) * k, alt, from.z + (to.z - from.z) * k);
      const ring = new THREE.Mesh(ringGeo, mat.rings[fleet].clone());
      ring.rotation.x = -Math.PI / 2;
      const shadow = new THREE.Mesh(shadowGeo, mat.shadow);
      shadow.rotation.x = -Math.PI / 2;
      const trailPts = Array.from({ length: 20 }, () => pos.clone());
      const trail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trailPts), mat.trails[fleet]);
      const sepRing = new THREE.Line(sepRingGeo, mat.sepRings[fleet].clone());
      sepRing.visible = false;
      const sepLink = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), mat.sepLink);
      sepLink.visible = false;
      scene.add(g, ring, shadow, trail, sepRing, sepLink);
      drones.push({
        id,
        fleet,
        pos,
        offset: new THREE.Vector3(),
        heading: Math.atan2(to.z - from.z, to.x - from.x),
        speed: 2.3 + rand() * 1.6,
        alt,
        target,
        mode: 'cruise',
        dwell: 0,
        pulse: rand(),
        labeled: id < 6,
        group: g,
        rotors,
        ring,
        shadow,
        trail,
        trailPts,
        trailClock: 0,
        sep: 1,
        yieldTo: null,
        sepRing,
        sepLink,
      });
    }
  }

  // Spoofed (claimed) position, the link to it, and the unsafe region.
  const ghost = buildDrone(mat.threat, false).g;
  ghost.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.material = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true });
  });
  const ghostRing = new THREE.Mesh(ringGeo, mat.threatRing);
  ghostRing.rotation.x = -Math.PI / 2;
  const ghostLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), mat.threatLine);
  const unsafe = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), mat.secureFill);
  const unsafeRingPts = Array.from({ length: 73 }, (_, i) => {
    const a = (i / 72) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  });
  const unsafeRing = new THREE.Line(new THREE.BufferGeometry().setFromPoints(unsafeRingPts), mat.secureLine);
  unsafeRing.computeLineDistances();
  scene.add(ghost, ghostRing, ghostLine, unsafe, unsafeRing);

  // ---------- Simulation ----------
  function phaseAt(time: number) {
    const cycle = Math.floor(time / CYCLE);
    let local = time - cycle * CYCLE;
    for (const p of PHASES) {
      if (local < p.duration) return { phase: p.phase, progress: local / p.duration, cycle };
      local -= p.duration;
    }
    return { phase: 'nominal' as Phase, progress: 0, cycle };
  }

  function pickSpoofer() {
    const cruising = drones.filter((d) => d.mode === 'cruise' && Math.hypot(d.pos.x, d.pos.z) < FLY_R * 0.35);
    const pool = cruising.length ? cruising : drones;
    spoofer = pool[Math.floor(Math.random() * pool.length)];
    // Claimed position: sideways from the track, toward the center of the flight area.
    const n = new THREE.Vector3(-Math.sin(spoofer.heading), 0, Math.cos(spoofer.heading));
    const toCenter = new THREE.Vector3(-spoofer.pos.x, 0, -spoofer.pos.z);
    ghostDir = n.multiplyScalar(n.dot(toCenter) >= 0 ? 1 : -1);
  }

  /**
   * Separation keeping: each airborne drone checks its protected zone ahead; if another drone is
   * inside, it slows in proportion to the distance. In head-on encounters the higher id yields.
   */
  let sepActive = -1;
  function keepSeparation(dt: number) {
    let active = 0;
    for (const d of drones) {
      let factor = 1;
      let yieldTo: number | null = null;
      if (d.mode !== 'dwell') {
        const hx = Math.cos(d.heading);
        const hz = Math.sin(d.heading);
        for (const o of drones) {
          if (o === d || o.mode === 'dwell') continue;
          const rx = o.pos.x - d.pos.x;
          const rz = o.pos.z - d.pos.z;
          const ry = (o.pos.y - d.pos.y) * SEP_VERTICAL_WEIGHT;
          const flat = Math.hypot(rx, rz);
          const dist = Math.hypot(flat, ry);
          if (dist > SEP_LOOKAHEAD || flat < 0.001) continue;
          if ((hx * rx + hz * rz) / flat < 0.35) continue;
          const back = (Math.cos(o.heading) * -rx + Math.sin(o.heading) * -rz) / flat;
          if (back > 0.35 && d.id < o.id) continue;
          const f = Math.max(0.12, Math.min(1, (dist - SEP_MIN) / (SEP_LOOKAHEAD - SEP_MIN)));
          if (f < factor) {
            factor = f;
            yieldTo = o.id;
          }
        }
      }
      d.sep += (factor - d.sep) * Math.min(1, dt * 4);
      d.yieldTo = factor < 0.97 ? yieldTo : null;
      if (d.yieldTo !== null) active++;
    }
    if (active !== sepActive) {
      sepActive = active;
      onSeparation?.(active);
    }
  }

  function step(dt: number) {
    clock += dt;
    const { phase, cycle } = phaseAt(clock);
    if (cycle !== cycleIndex) {
      cycleIndex = cycle;
      pickSpoofer();
    }
    if (phase !== lastPhase) {
      lastPhase = phase;
      onStatus({ phase, tracks: drones.length, spoofer: spoofer?.id ?? null });
    }
    const avoiding = phase === 'detected' && spoofer;
    keepSeparation(dt);

    for (const d of drones) {
      const loiter = d === spoofer && phase !== 'nominal' ? 0.1 : 1;
      const to = pads[d.target].pos;
      if (d.mode === 'dwell') {
        d.dwell -= dt;
        if (d.dwell <= 0) {
          let next = Math.floor(Math.random() * pads.length);
          if (next === d.target) next = (next + 1) % pads.length;
          d.target = next;
          d.mode = 'climb';
        }
      } else if (d.mode === 'climb') {
        d.pos.y = Math.min(d.alt, d.pos.y + 2.4 * d.sep * dt);
        const nt = pads[d.target].pos;
        d.heading = Math.atan2(nt.z - d.pos.z, nt.x - d.pos.x);
        if (d.pos.y >= d.alt - 0.01) d.mode = 'cruise';
      } else if (d.mode === 'cruise') {
        const dx = to.x - d.pos.x;
        const dz = to.z - d.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.06) {
          d.mode = 'descend';
        } else {
          let delta = Math.atan2(dz, dx) - d.heading;
          delta = Math.atan2(Math.sin(delta), Math.cos(delta));
          d.heading += delta * Math.min(1, dt * 3);
          const v = Math.min(d.speed * loiter * d.sep * dt, dist);
          d.pos.x += Math.cos(d.heading) * v;
          d.pos.z += Math.sin(d.heading) * v;
        }
      } else if (d.mode === 'descend') {
        d.pos.y = Math.max(to.y + 0.32, d.pos.y - 2.2 * d.sep * dt);
        if (d.pos.y <= to.y + 0.33) {
          d.mode = 'dwell';
          d.dwell = 0.8 + Math.random() * 1.6;
        }
      }

      // Avoid the unsafe region: push sideways and climb a little.
      const want = new THREE.Vector3();
      if (avoiding && d !== spoofer && d.mode === 'cruise') {
        const ax = d.pos.x - spoofer!.pos.x;
        const az = d.pos.z - spoofer!.pos.z;
        const ad = Math.hypot(ax, az) || 1;
        if (ad < AVOID_R) {
          const push = (AVOID_R - ad) * 0.55;
          want.set((ax / ad) * push, push * 0.35, (az / ad) * push);
        }
      }
      d.offset.lerp(want, Math.min(1, dt * 2));

      d.pulse = (d.pulse + dt / 2.2) % 1;
      d.trailClock += dt;
      if (d.trailClock > 0.11) {
        d.trailClock = 0;
        d.trailPts.shift();
        d.trailPts.push(d.pos.clone().add(d.offset));
      }
    }
  }

  // ---------- Camera ----------
  const target = new THREE.Vector3(0, 4.5, 0);
  const ELEV = THREE.MathUtils.degToRad(36);

  function placeCamera(time: number) {
    const az = THREE.MathUtils.degToRad(-38) + Math.sin(time * 0.045) * 0.14;
    camera.position.set(
      target.x + camDist * Math.cos(ELEV) * Math.cos(az),
      target.y + camDist * Math.sin(ELEV),
      target.z + camDist * Math.cos(ELEV) * Math.sin(az),
    );
    camera.lookAt(target);
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    overlay.width = Math.round(width * dpr);
    overlay.height = Math.round(height * dpr);
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    zone = getZone?.(width, height) ?? { x: 0, y: 0, w: width, h: height };

    camera.aspect = width / height;
    // Fit the flight area (≈ 2·FLY_R + margin) to the zone, then center the view on the zone.
    const span = FLY_R * 2 + 9;
    const fitPx = Math.min(zone.w * 1.05, zone.h * 1.5);
    camDist = (span * height) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * fitPx);
    camera.near = camDist * 0.3;
    camera.far = camDist * 3;
    const cx = zone.x + zone.w / 2;
    const cy = zone.y + zone.h / 2;
    camera.setViewOffset(width, height, width / 2 - cx, height / 2 - cy, width, height);
    camera.updateProjectionMatrix();
    if (scene.fog) {
      (scene.fog as THREE.Fog).near = camDist * 0.85;
      (scene.fog as THREE.Fog).far = camDist * 1.9;
    }
    const count = zone.w * zone.h > 300000 ? 18 : 12;
    if (count !== drones.length) spawnDrones(count);
  }

  // ---------- Rendering ----------
  const tmp = new THREE.Vector3();
  function project(p: V3) {
    tmp.copy(p).project(camera);
    return { x: (tmp.x * 0.5 + 0.5) * width, y: (-tmp.y * 0.5 + 0.5) * height, behind: tmp.z > 1 };
  }

  /** Screen rectangles already used by labels this frame, so labels never overlap. */
  let taken: { x: number; y: number; w: number; h: number }[] = [];
  const free = (r: { x: number; y: number; w: number; h: number }) =>
    !taken.some((o) => r.x < o.x + o.w + 4 && r.x + r.w + 4 > o.x && r.y < o.y + o.h + 2 && r.y + r.h + 2 > o.y);

  function label(text: string, at: V3, color: string, alpha = 1, side: 1 | -1 = 1, below = false, force = false, lift = 15) {
    const p = project(at);
    if (p.behind) return;
    octx.save();
    octx.globalAlpha = alpha;
    octx.strokeStyle = color;
    octx.fillStyle = color;
    octx.font = `500 10.5px ${MONO}`;
    const w = octx.measureText(text).width;
    const minX = Math.max(10, zone.x - 8);
    const maxX = Math.min(width - 10, zone.x + zone.w + 8);
    let dir = side;
    if (dir > 0 && p.x + 18 + w > maxX) dir = -1;
    if (dir < 0 && p.x - 18 - w < minX) dir = 1;
    const vy = below ? 1 : -1;
    const sx = Math.min(maxX - w, Math.max(minX, dir > 0 ? p.x + 16 : p.x - 16 - w));
    const ty = below ? p.y + 24 : p.y - lift;
    const box = { x: sx, y: ty - 10, w, h: 13 };
    if (!force && !free(box)) {
      octx.restore();
      return;
    }
    taken.push(box);
    // Halo in the page background color keeps text legible over buildings.
    octx.save();
    octx.strokeStyle = t.bg;
    octx.lineWidth = 3.5;
    octx.lineJoin = 'round';
    octx.globalAlpha = alpha * 0.85;
    octx.strokeText(text, sx, ty);
    octx.restore();
    octx.lineWidth = 1;
    octx.beginPath();
    octx.moveTo(p.x + 6 * dir, p.y + 6 * vy);
    octx.lineTo(p.x + 13 * dir, p.y + (below ? 13 : lift - 2) * vy);
    octx.stroke();
    octx.fillText(text, sx, ty);
    octx.restore();
  }

  function render(time: number) {
    placeCamera(time);
    const { phase, progress } = phaseAt(clock);
    const attack = phase !== 'nominal' && spoofer;
    const fade = phase === 'recovering' ? 1 - progress : 1;
    const ghostAmt = phase === 'spoofing' ? progress : attack ? 1 : 0;

    for (const d of drones) {
      const p = d.group.position.copy(d.pos).add(d.offset);
      d.group.rotation.y = -d.heading;
      for (const r of d.rotors) r.rotation.y += 0.9;
      const isSpoofer = attack && d === spoofer;
      // Broadcast ring: the spoofer's comes from its claimed position.
      const src = isSpoofer ? ghost.position : p;
      const s = 0.4 + d.pulse * 2.6;
      d.ring.position.copy(src);
      d.ring.scale.setScalar(s);
      const rm = d.ring.material as THREE.MeshBasicMaterial;
      rm.color.copy(isSpoofer ? col.threat : col.fleets[d.fleet]);
      rm.opacity = (1 - d.pulse) * 0.5 * (isSpoofer ? fade : 1);
      // Ground or roof shadow straight below.
      d.shadow.position.set(p.x, 0.03, p.z);
      d.shadow.scale.setScalar(1 + p.y * 0.03);
      d.trail.geometry.setFromPoints(d.trailPts);
      // Separation keeping: dashed protected-zone ring and a link to the aircraft being yielded to.
      const yielding = d.yieldTo !== null;
      d.sepRing.visible = d.sepLink.visible = yielding;
      if (yielding) {
        const strength = 1 - d.sep;
        d.sepRing.position.copy(p);
        d.sepRing.computeLineDistances();
        (d.sepRing.material as THREE.LineDashedMaterial).opacity = 0.6 + strength * 0.4;
        const o = drones[d.yieldTo!];
        d.sepLink.geometry.setFromPoints([p.clone(), o.group.position.clone()]);
        d.sepLink.computeLineDistances();
        mat.sepLink.opacity = 0.3 + strength * 0.4;
      }
    }

    ghost.visible = ghostLine.visible = ghostRing.visible = Boolean(attack) && ghostAmt > 0.02;
    unsafe.visible = unsafeRing.visible = Boolean(attack) && phase !== 'spoofing';
    if (attack && spoofer) {
      const sp = spoofer.group.position;
      ghost.position.copy(sp).addScaledVector(ghostDir, GHOST_DIST * ghostAmt);
      ghost.rotation.y = -spoofer.heading;
      ghost.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        if (m && 'opacity' in m) {
          m.color?.copy(col.threat);
          m.opacity = 0.9 * fade;
        }
      });
      ghostRing.position.copy(ghost.position);
      ghostRing.scale.setScalar(0.4 + spoofer.pulse * 2.6);
      mat.threatRing.opacity = (1 - spoofer.pulse) * 0.55 * fade;
      ghostLine.geometry.setFromPoints([sp.clone(), ghost.position.clone()]);
      ghostLine.computeLineDistances();
      mat.threatLine.opacity = fade;

      const grow = phase === 'detected' ? Math.min(1, progress * 4) : 1;
      const r = UNSAFE_R * grow * (1 + Math.sin(clock * 3) * 0.03);
      unsafe.position.copy(sp);
      unsafe.scale.set(r * 1.15, r * 0.75, r * 1.15);
      mat.secureFill.opacity = 0.13 * fade;
      unsafeRing.position.copy(sp);
      unsafeRing.scale.set(r * 1.15, 1, r * 1.15);
      mat.secureLine.opacity = 0.95 * fade;
    }

    renderer.render(scene, camera);

    // Labels: attack labels first (they always show), then vertiports, then call signs.
    octx.clearRect(0, 0, width, height);
    taken = [];
    if (attack && spoofer) {
      const sp = spoofer.group.position;
      if (ghostAmt > 0.02) {
        // Above the ghost and away from the unsafe region, clear of the ghost's own rotors.
        const away = project(ghost.position).x >= project(sp).x ? 1 : -1;
        label(width < 600 ? 'CLAIMED POSITION' : 'RID · CLAIMED POSITION', ghost.position, t.threat, fade * Math.min(1, ghostAmt * 2), away, false, true, 30);
      }
      if (phase !== 'spoofing') {
        const grow = phase === 'detected' ? Math.min(1, progress * 4) : 1;
        // Below the unsafe region, so it never meets the claimed-position label above.
        const bottom = sp.clone().add(new THREE.Vector3(0, -UNSAFE_R * 0.75, 0));
        label(width < 600 ? 'SPOOFER LOCALIZED' : 'SPOOFER LOCALIZED · UNSAFE REGION', bottom, t.secure, fade * grow, -1, true, true);
      }
    }
    pads.forEach((pad, i) => {
      const p = project(pad.pos);
      if (p.behind || p.x > zone.x + zone.w + 20 || p.x < zone.x - 20) return;
      // Offset by the pad's on-screen radius so the label clears its ring.
      const edge = project(pad.pos.clone().add(new THREE.Vector3(1.35, 0, 0)));
      const rpx = Math.max(10, Math.hypot(edge.x - p.x, edge.y - p.y));
      octx.save();
      octx.font = `500 10px ${MONO}`;
      const name = `VP-${String(i + 1).padStart(2, '0')}`;
      const w = octx.measureText(name).width;
      const x = p.x + rpx + 6 + w > width - 8 ? p.x - rpx - 6 - w : p.x + rpx + 6;
      const box = { x, y: p.y - 6, w, h: 12 };
      if (free(box)) {
        taken.push(box);
        octx.strokeStyle = t.bg;
        octx.lineWidth = 3;
        octx.lineJoin = 'round';
        octx.globalAlpha = 0.8;
        octx.strokeText(name, x, p.y + 4);
        octx.fillStyle = t.label;
        octx.globalAlpha = 0.95;
        octx.fillText(name, x, p.y + 4);
      }
      octx.restore();
    });
    for (const d of drones) {
      if (!d.labeled || (attack && d === spoofer) || d.mode === 'dwell') continue;
      const p = d.group.position;
      if (attack && spoofer && p.distanceTo(spoofer.group.position) < 7) continue;
      label(`${FLEET_CODES[d.fleet]} ${String(400 + d.id * 37).slice(0, 3)}`, p, t.fleets[d.fleet], 0.95);
    }
  }

  // ---------- Loop & lifecycle ----------
  let wall = 0;
  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    wall += dt;
    step(dt);
    render(wall);
    frame = requestAnimationFrame(loop);
  }

  function play() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) {
      // One still frame that tells the story: spoofer localized, traffic rerouted.
      clock = 0;
      cycleIndex = -1;
      lastPhase = null;
      const until = PHASES[0].duration + PHASES[1].duration + 1.6;
      while (clock < until) step(1 / 30);
      render(0);
      return;
    }
    if (!visible || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }

  applyTheme();
  layout();
  for (let i = 0; i < 90; i++) step(1 / 30); // warm up so trails exist on the first frame
  render(0);
  play();

  const ro = new ResizeObserver(() => {
    layout();
    applyTheme();
    render(wall);
  });
  ro.observe(canvas);
  const mo = new MutationObserver(() => {
    applyTheme();
    render(wall);
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) play();
    else cancelAnimationFrame(frame);
  });
  io.observe(canvas);
  const onVis = () => (document.hidden ? cancelAnimationFrame(frame) : play());
  document.addEventListener('visibilitychange', onVis);
  reducedMotion.addEventListener('change', play);
  document.fonts?.load(`500 10px ${MONO}`).then(() => render(wall));

  return () => {
    cancelAnimationFrame(frame);
    ro.disconnect();
    mo.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    reducedMotion.removeEventListener('change', play);
    renderer.dispose();
  };
}
