/**
 * Hero illustration: delivery-drone traffic from three operator fleets flying between vertiports (circled-H pads) over a city grid. Every cycle one aircraft starts
 * broadcasting a false Remote ID position; the system localizes it from signal measurements,
 * marks an unsafe region, and nearby traffic routes around it. This is the project's story in
 * one loop: an airspace where not every signal can be trusted.
 */

type Vec = { x: number; y: number };
type Block = { x: number; y: number; w: number; h: number };
/** Area of the canvas where traffic may fly, in CSS pixels relative to the canvas. */
export type Zone = { x: number; y: number; w: number; h: number; avoid?: Rect[] };
type Rect = { x: number; y: number; w: number; h: number };

interface Drone {
  id: number;
  pos: Vec;
  /** Index into `pads` of the current destination. */
  target: number;
  speed: number;
  heading: number;
  trail: Vec[];
  trailClock: number;
  pulse: number;
  /** Avoidance displacement, eased toward the desired value each frame. */
  offset: Vec;
  labeled: boolean;
}

export type Phase = 'nominal' | 'spoofing' | 'detected' | 'recovering';

export interface AirspaceStatus {
  phase: Phase;
  tracks: number;
  spoofer: number | null;
}

interface Palette {
  block: string;
  grid: string;
  gridMajor: string;
  track: string;
  label: string;
  secure: string;
  threat: string;
  /** Fill behind vertiport markers. */
  pad: string;
  /** One color per operator fleet. */
  fleets: string[];
}

const PHASES: { phase: Phase; duration: number }[] = [
  { phase: 'nominal', duration: 3.2 },
  { phase: 'spoofing', duration: 2.6 },
  { phase: 'detected', duration: 4.2 },
  { phase: 'recovering', duration: 1.0 },
];
const CYCLE = PHASES.reduce((sum, p) => sum + p.duration, 0);
const GHOST_DISTANCE = 88;
const AVOID_RADIUS = 160;
/** Call-sign prefixes for the three operator fleets; drones are assigned round-robin. */
export const FLEET_CODES = ['OP-A', 'OP-B', 'OP-C'];
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    block: v('--map-block'),
    grid: v('--map-grid'),
    gridMajor: v('--map-grid-major'),
    track: v('--map-track'),
    label: v('--ink-3'),
    secure: v('--accent-graphic'),
    threat: v('--signal-graphic'),
    pad: v('--bg-raised'),
    fleets: [v('--fleet-a'), v('--fleet-b'), v('--fleet-c')],
  };
}

function withAlpha(color: string, alpha: number, ctx: CanvasRenderingContext2D, draw: () => void) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  draw();
  ctx.restore();
}

export function startAirspace(
  canvas: HTMLCanvasElement,
  onStatus: (status: AirspaceStatus) => void,
  /** Keeps traffic clear of the hero text; defaults to the whole canvas. */
  getZone?: (width: number, height: number) => Zone,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticLayer = document.createElement('canvas');
  let palette = readPalette();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pads: Vec[] = [];
  let zone: Zone = { x: 0, y: 0, w: 1, h: 1 };
  let blocks: Block[] = [];
  let drones: Drone[] = [];
  let clock = 0;
  let cycleIndex = -1;
  let spoofer: Drone | null = null;
  let ghostDir: Vec = { x: 0, y: -1 };
  let lastPhase: Phase | null = null;
  let frame = 0;
  let last = 0;
  let visible = true;

  // ---------- Scene ----------

  function buildScene() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [canvas, staticLayer]) {
      c.width = width * dpr;
      c.height = height * dpr;
    }

    const rand = mulberry32(20241001);
    blocks = [];
    const street = 14;
    for (let x = -20; x < width + 20; ) {
      const bw = 80 + rand() * 70;
      for (let y = -20; y < height + 20; ) {
        const bh = 70 + rand() * 60;
        blocks.push({ x, y, w: bw, h: bh });
        y += bh + street;
      }
      x += bw + street;
    }

    zone = getZone?.(width, height) ?? { x: 0, y: 0, w: width, h: height };
    const area = zone.w * zone.h;
    const inset = 34;
    const blocked = (p: Vec) =>
      (zone.avoid ?? []).some((a) => p.x > a.x - 40 && p.x < a.x + a.w + 40 && p.y > a.y - 40 && p.y < a.y + a.h + 40);

    // Waypoints spread over the whole zone: corners and center first, then edges and in-betweens.
    const anchors: [number, number][] = [
      [0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5],
      [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5],
      [0.27, 0.28], [0.73, 0.72], [0.27, 0.72], [0.73, 0.28],
    ];
    const padCount = Math.max(7, Math.min(anchors.length, Math.round(area / 38000)));
    pads = [];
    for (const [ax, ay] of anchors.slice(0, padCount)) {
      const jx = ax === 0 || ax === 1 ? 0 : (rand() - 0.5) * 0.08;
      const jy = ay === 0 || ay === 1 ? 0 : (rand() - 0.5) * 0.08;
      const p = {
        x: zone.x + inset + (ax + jx) * (zone.w - inset * 2),
        y: zone.y + inset + (ay + jy) * (zone.h - inset * 2),
      };
      // A corner hidden by the status panel moves just above it instead.
      const hit = (zone.avoid ?? []).find((a) => p.x > a.x - 40 && p.x < a.x + a.w + 40 && p.y > a.y - 40);
      if (hit && blocked(p)) p.y = hit.y - 56;
      if (!blocked(p)) pads.push(p);
    }
    if (pads.length < 2)
      pads = [
        { x: zone.x + zone.w * 0.3, y: zone.y + zone.h * 0.4 },
        { x: zone.x + zone.w * 0.75, y: zone.y + zone.h * 0.65 },
      ];

    drawStaticLayer();

    const count = Math.max(9, Math.min(24, Math.round(area / 26000)));
    drones = Array.from({ length: count }, (_, id) => {
      const from = pads[Math.floor(rand() * pads.length)];
      const t = rand();
      const target = Math.floor(rand() * pads.length);
      const to = pads[target];
      const pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      return {
        id,
        pos,
        target,
        speed: 20 + rand() * 22,
        heading: Math.atan2(to.y - from.y, to.x - from.x),
        trail: [],
        trailClock: 0,
        pulse: rand(),
        offset: { x: 0, y: 0 },
        labeled: id < 5,
      };
    });
    spoofer = null;
    cycleIndex = -1;
  }

  function drawStaticLayer() {
    const rand = mulberry32(7);
    const s = staticLayer.getContext('2d')!;
    s.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.clearRect(0, 0, width, height);

    // Chart grid
    s.lineWidth = 1;
    for (let x = 0.5; x < width; x += 24) {
      s.strokeStyle = Math.round(x - 0.5) % 120 === 0 ? palette.gridMajor : palette.grid;
      s.beginPath();
      s.moveTo(x, 0);
      s.lineTo(x, height);
      s.stroke();
    }
    for (let y = 0.5; y < height; y += 24) {
      s.strokeStyle = Math.round(y - 0.5) % 120 === 0 ? palette.gridMajor : palette.grid;
      s.beginPath();
      s.moveTo(0, y);
      s.lineTo(width, y);
      s.stroke();
    }

    // Building footprints
    s.fillStyle = palette.block;
    for (const b of blocks) {
      const parts = 1 + Math.floor(rand() * 3);
      const pw = b.w / parts;
      for (let i = 0; i < parts; i++) {
        const inset = 4 + rand() * 6;
        s.fillRect(b.x + i * pw + inset, b.y + inset, pw - inset * 2, b.h - inset * 2);
      }
    }

    // Vertiports: the standard circled "H" landing pad.
    s.font = `500 10px ${MONO}`;
    const R = 10;
    pads.forEach((p, i) => {
      s.globalAlpha = 0.9;
      s.fillStyle = palette.pad;
      s.beginPath();
      s.arc(p.x, p.y, R, 0, Math.PI * 2);
      s.fill();
      s.strokeStyle = palette.track;
      s.globalAlpha = 0.55;
      s.lineWidth = 1.2;
      s.stroke();
      s.globalAlpha = 0.25;
      s.beginPath();
      s.arc(p.x, p.y, R + 4, 0, Math.PI * 2);
      s.setLineDash([2, 3]);
      s.stroke();
      s.setLineDash([]);
      // "H"
      s.globalAlpha = 0.75;
      s.lineWidth = 1.6;
      s.lineCap = 'round';
      const h = 4.2;
      const w = 3.4;
      s.beginPath();
      s.moveTo(p.x - w, p.y - h);
      s.lineTo(p.x - w, p.y + h);
      s.moveTo(p.x + w, p.y - h);
      s.lineTo(p.x + w, p.y + h);
      s.moveTo(p.x - w, p.y);
      s.lineTo(p.x + w, p.y);
      s.stroke();
      s.lineCap = 'butt';
      s.globalAlpha = 0.8;
      s.fillStyle = palette.label;
      const name = `VP-${String(i + 1).padStart(2, '0')}`;
      const tw = s.measureText(name).width;
      // Labels flip to the left of pads near the right edge so they never clip.
      const lx = p.x + R + 7 + tw > width - 8 ? p.x - R - 7 - tw : p.x + R + 7;
      s.fillText(name, lx, p.y + 3.5);
      s.globalAlpha = 1;
    });
  }

  // ---------- Simulation ----------

  function phaseAt(t: number): { phase: Phase; progress: number; cycle: number } {
    const cycle = Math.floor(t / CYCLE);
    let local = t - cycle * CYCLE;
    for (const p of PHASES) {
      if (local < p.duration) return { phase: p.phase, progress: local / p.duration, cycle };
      local -= p.duration;
    }
    return { phase: 'nominal', progress: 0, cycle };
  }

  function pickSpoofer() {
    // Prefer a drone well inside the zone so its claimed position and labels stay in view.
    const cx = zone.x + zone.w / 2;
    const cy = zone.y + zone.h / 2;
    const clear = (d: Drone) =>
      !(zone.avoid ?? []).some((a) => d.pos.x > a.x - 170 && d.pos.x < a.x + a.w + 170 && d.pos.y > a.y - 150);
    const central = drones.filter(
      (d) => Math.abs(d.pos.x - cx) < zone.w * 0.3 && Math.abs(d.pos.y - cy) < zone.h * 0.22 && clear(d),
    );
    const pool = central.length ? central : drones;
    spoofer = pool[Math.floor(Math.random() * pool.length)];
    // Offset the claimed position perpendicular to the track, toward the zone's center.
    const n = { x: -Math.sin(spoofer.heading), y: Math.cos(spoofer.heading) };
    const side = n.x * (cx - spoofer.pos.x) + n.y * (cy - spoofer.pos.y) >= 0 ? 1 : -1;
    ghostDir = { x: n.x * side, y: n.y * side };
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
    for (const d of drones) {
      const to = pads[d.target];
      const dx = to.x - d.pos.x;
      const dy = to.y - d.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 2) {
        let next = Math.floor(Math.random() * pads.length);
        if (next === d.target) next = (next + 1) % pads.length;
        d.target = next;
      } else {
        const desired = Math.atan2(dy, dx);
        let delta = desired - d.heading;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        d.heading += delta * Math.min(1, dt * 3);
        // The spoofer loiters while it is being localized, so the scene stays in frame.
        const loiter = d === spoofer && phase !== 'nominal' ? 0.25 : 1;
        const v = Math.min(d.speed * loiter * dt, dist);
        d.pos.x += Math.cos(d.heading) * v;
        d.pos.y += Math.sin(d.heading) * v;
      }

      let want: Vec = { x: 0, y: 0 };
      if (avoiding && d !== spoofer) {
        const ax = d.pos.x - spoofer!.pos.x;
        const ay = d.pos.y - spoofer!.pos.y;
        const ad = Math.hypot(ax, ay) || 1;
        if (ad < AVOID_RADIUS) {
          const push = (AVOID_RADIUS - ad) * 0.7;
          want = { x: (ax / ad) * push, y: (ay / ad) * push };
        }
      }
      const ease = Math.min(1, dt * 2.2);
      d.offset.x += (want.x - d.offset.x) * ease;
      d.offset.y += (want.y - d.offset.y) * ease;
      // Keep avoidance maneuvers inside the flight zone.
      const pad = 14;
      d.offset.x = Math.min(zone.x + zone.w + pad - d.pos.x, Math.max(zone.x - pad - d.pos.x, d.offset.x));
      d.offset.y = Math.min(zone.y + zone.h + pad - d.pos.y, Math.max(zone.y - pad - d.pos.y, d.offset.y));

      d.pulse = (d.pulse + dt / 2.4) % 1;
      d.trailClock += dt;
      if (d.trailClock > 0.12) {
        d.trailClock = 0;
        d.trail.push({ x: d.pos.x + d.offset.x, y: d.pos.y + d.offset.y });
        if (d.trail.length > 26) d.trail.shift();
      }
    }
  }

  // ---------- Rendering ----------

  const fleetColor = (d: Drone) => palette.fleets[d.id % palette.fleets.length];

  /**
   * Top-down delivery quadcopter: X-frame, four rotors, a body carrying a parcel, and a nose
   * marker so heading stays readable. `filled` = real aircraft; outline = spoofed (claimed) position.
   */
  function glyph(p: Vec, heading: number, size: number, filled: boolean) {
    const c = ctx!;
    const arm = size * 1.15;
    const rotor = size * 0.62;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(heading + Math.PI / 4);
    c.lineWidth = Math.max(1, size * 0.22);
    c.lineCap = 'round';
    // Arms
    c.beginPath();
    c.moveTo(-arm, -arm);
    c.lineTo(arm, arm);
    c.moveTo(arm, -arm);
    c.lineTo(-arm, arm);
    c.stroke();
    // Rotors
    c.lineWidth = Math.max(1, size * 0.16);
    for (const [x, y] of [[arm, arm], [-arm, arm], [arm, -arm], [-arm, -arm]]) {
      c.beginPath();
      c.arc(x, y, rotor, 0, Math.PI * 2);
      if (filled) {
        c.save();
        c.globalAlpha *= 0.22;
        c.fill();
        c.restore();
      }
      c.stroke();
    }
    c.rotate(-Math.PI / 4);
    // Body with parcel
    const b = size * 0.62;
    c.beginPath();
    c.roundRect(-b, -b, b * 2, b * 2, size * 0.2);
    if (filled) c.fill();
    else c.stroke();
    if (filled) {
      c.save();
      c.globalAlpha *= 0.55;
      c.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fff';
      c.lineWidth = Math.max(0.8, size * 0.12);
      c.beginPath();
      c.moveTo(-b * 0.55, 0);
      c.lineTo(b * 0.55, 0);
      c.moveTo(0, -b * 0.55);
      c.lineTo(0, b * 0.55);
      c.stroke();
      c.restore();
    }
    // Nose marker (direction of travel)
    c.beginPath();
    c.moveTo(b + size * 0.9, 0);
    c.lineTo(b + size * 0.25, size * 0.42);
    c.lineTo(b + size * 0.25, -size * 0.42);
    c.closePath();
    c.fill();
    c.restore();
  }

  function label(text: string, p: Vec, color: string, alpha = 1, side?: 1 | -1) {
    withAlpha(color, alpha, ctx!, () => {
      ctx!.font = `500 10.5px ${MONO}`;
      ctx!.lineWidth = 1;
      const w = ctx!.measureText(text).width;
      const fitsRight = p.x + 18 + w < Math.min(width - 10, zone.x + zone.w + 8);
      const minX = Math.max(10, zone.x - 8);
      const maxX = Math.min(width - 10, zone.x + zone.w + 8);
      const fitsLeft = p.x - 18 - w > minX;
      // Prefer the requested side, but never draw off-canvas.
      const flip = side ? (side < 0 ? fitsLeft || !fitsRight : !fitsRight && fitsLeft) : !fitsRight;
      const dir = flip ? -1 : 1;
      ctx!.beginPath();
      ctx!.moveTo(p.x + 5 * dir, p.y - 5);
      ctx!.lineTo(p.x + 12 * dir, p.y - 12);
      ctx!.stroke();
      // Clamp the text inside the canvas when neither side has room.
      const start = Math.min(maxX - w, Math.max(minX, flip ? p.x - 15 - w : p.x + 15));
      ctx!.fillText(text, start, p.y - 14);
    });
  }

  function render() {
    const c = ctx!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(staticLayer, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const { phase, progress } = phaseAt(clock);
    const attackActive = phase === 'spoofing' || phase === 'detected' || phase === 'recovering';
    const fade = phase === 'recovering' ? 1 - progress : 1;
    const ghostAmount = phase === 'spoofing' ? progress : attackActive ? 1 : 0;

    for (const d of drones) {
      const p = { x: d.pos.x + d.offset.x, y: d.pos.y + d.offset.y };

      if (d.trail.length > 1) {
        withAlpha(fleetColor(d), 0.32, c, () => {
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(d.trail[0].x, d.trail[0].y);
          for (const t of d.trail) c.lineTo(t.x, t.y);
          c.lineTo(p.x, p.y);
          c.stroke();
        });
      }

      const isSpoofer = attackActive && d === spoofer;
      const ghost = isSpoofer
        ? {
            x: Math.min(zone.x + zone.w - 12, Math.max(zone.x + 12, p.x + ghostDir.x * GHOST_DISTANCE * ghostAmount)),
            y: Math.min(zone.y + zone.h - 12, Math.max(zone.y + 24, p.y + ghostDir.y * GHOST_DISTANCE * ghostAmount)),
          }
        : p;

      // Remote ID broadcast ring: the spoofer's rings come from the position it claims.
      const r = 5 + d.pulse * 26;
      withAlpha(isSpoofer ? palette.threat : fleetColor(d), (1 - d.pulse) * 0.45 * (isSpoofer ? fade : 1), c, () => {
        c.lineWidth = 1;
        c.beginPath();
        c.arc(ghost.x, ghost.y, r, 0, Math.PI * 2);
        c.stroke();
      });

      withAlpha(fleetColor(d), 1, c, () => glyph(p, d.heading, 5.2, true));

      if (isSpoofer && ghostAmount > 0.02) {
        withAlpha(palette.threat, fade, c, () => {
          c.lineWidth = 1.2;
          c.setLineDash([3, 3]);
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(ghost.x, ghost.y);
          c.stroke();
          c.setLineDash([]);
          glyph(ghost, d.heading, 5.2, false);
        });
        label(width < 600 ? 'CLAIMED POSITION' : 'RID · CLAIMED POSITION', ghost, palette.threat, fade * Math.min(1, ghostAmount * 2));
      }

      if (isSpoofer && phase !== 'spoofing') {
        const grow = phase === 'detected' ? Math.min(1, progress * 4) : 1;
        const radius = (42 + Math.sin(clock * 3) * 2) * grow;
        withAlpha(palette.secure, fade, c, () => {
          c.lineWidth = 1.4;
          c.setLineDash([5, 4]);
          c.beginPath();
          c.ellipse(p.x, p.y, radius * 1.15, radius, d.heading, 0, Math.PI * 2);
          c.stroke();
          c.setLineDash([]);
          c.globalAlpha *= 0.08;
          c.fill();
        });
        // Above or below the unsafe region, on the side away from the claimed position.
        const text = width < 600 ? 'SPOOFER LOCALIZED' : 'SPOOFER LOCALIZED · UNSAFE REGION';
        withAlpha(palette.secure, fade * grow, c, () => {
          c.font = `500 10.5px ${MONO}`;
          const w = c.measureText(text).width;
          const x = Math.min(Math.min(width - 10, zone.x + zone.w + 8) - w, Math.max(Math.max(10, zone.x - 8), p.x - w / 2));
          const y = ghostDir.y > 0 ? p.y - radius - 10 : p.y + radius + 18;
          c.fillText(text, x, y);
        });
      } else if (
        d.labeled &&
        !isSpoofer &&
        // Keep the attack labels readable: hide nearby call signs while they're shown.
        !(attackActive && spoofer && Math.hypot(p.x - spoofer.pos.x, p.y - spoofer.pos.y) < 130) &&
        // ...and while a drone is at a vertiport, whose own label sits there.
        !pads.some((v) => Math.hypot(p.x - v.x, p.y - v.y) < 46)
      ) {
        label(`${FLEET_CODES[d.id % FLEET_CODES.length]} ${String(400 + d.id * 37).slice(0, 3)}`, p, fleetColor(d), 0.95);
      }
    }
  }

  // ---------- Loop & lifecycle ----------

  function loop(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt);
    render();
    frame = requestAnimationFrame(loop);
  }

  function play() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) {
      // Static frame that still tells the story: spoofer detected, traffic rerouted.
      clock = 0;
      cycleIndex = -1;
      lastPhase = null;
      const target = PHASES[0].duration + PHASES[1].duration + 1.5;
      while (clock < target) step(1 / 30);
      render();
      return;
    }
    if (!visible || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(loop);
  }

  function restart() {
    palette = readPalette();
    buildScene();
    clock = 0;
    lastPhase = null;
    // Warm up so trails exist on the first painted frame.
    for (let i = 0; i < 40; i++) step(1 / 30);
    render();
    play();
  }

  const resizeObserver = new ResizeObserver(() => restart());
  resizeObserver.observe(canvas);

  const themeObserver = new MutationObserver(() => {
    palette = readPalette();
    drawStaticLayer();
    render();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const viewObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) play();
    else cancelAnimationFrame(frame);
  });
  viewObserver.observe(canvas);

  const onVisibility = () => (document.hidden ? cancelAnimationFrame(frame) : play());
  document.addEventListener('visibilitychange', onVisibility);
  reducedMotion.addEventListener('change', play);

  document.fonts?.load(`500 10px ${MONO}`).then(restart, restart);

  return () => {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    viewObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    reducedMotion.removeEventListener('change', play);
  };
}
