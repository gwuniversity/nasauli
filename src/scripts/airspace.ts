/**
 * Hero illustration: drone traffic over a city grid. Every cycle one aircraft starts
 * broadcasting a false Remote ID position; the system localizes it from signal measurements,
 * marks an unsafe region, and nearby traffic routes around it. This is the project's story in
 * one loop: an airspace where not every signal can be trusted.
 */

type Vec = { x: number; y: number };
type Block = { x: number; y: number; w: number; h: number };

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
}

const PHASES: { phase: Phase; duration: number }[] = [
  { phase: 'nominal', duration: 3.2 },
  { phase: 'spoofing', duration: 2.6 },
  { phase: 'detected', duration: 4.2 },
  { phase: 'recovering', duration: 1.0 },
];
const CYCLE = PHASES.reduce((sum, p) => sum + p.duration, 0);
const GHOST_DISTANCE = 72;
const AVOID_RADIUS = 135;
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

export function startAirspace(canvas: HTMLCanvasElement, onStatus: (status: AirspaceStatus) => void) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const staticLayer = document.createElement('canvas');
  let palette = readPalette();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let pads: Vec[] = [];
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

    pads = [];
    const padCount = Math.max(6, Math.min(12, Math.round((width * height) / 90000)));
    const usable = blocks.filter((b) => b.x > 20 && b.y > 30 && b.x + b.w < width - 20 && b.y + b.h < height - 30);
    for (let i = 0; i < padCount && usable.length; i++) {
      const b = usable.splice(Math.floor(rand() * usable.length), 1)[0];
      pads.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
    if (pads.length < 2) pads = [{ x: width * 0.3, y: height * 0.4 }, { x: width * 0.8, y: height * 0.6 }];

    drawStaticLayer();

    const count = Math.max(10, Math.min(26, Math.round((width * height) / 50000)));
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
        speed: 16 + rand() * 18,
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

    // Vertiports
    s.font = `500 9px ${MONO}`;
    pads.forEach((p, i) => {
      s.strokeStyle = palette.track;
      s.globalAlpha = 0.5;
      s.lineWidth = 1;
      s.beginPath();
      s.arc(p.x, p.y, 7, 0, Math.PI * 2);
      s.stroke();
      s.beginPath();
      s.moveTo(p.x - 3, p.y);
      s.lineTo(p.x + 3, p.y);
      s.moveTo(p.x, p.y - 3);
      s.lineTo(p.x, p.y + 3);
      s.stroke();
      s.globalAlpha = 0.75;
      s.fillStyle = palette.label;
      s.fillText(`VP-${String(i + 1).padStart(2, '0')}`, p.x + 11, p.y + 3);
      s.fillStyle = palette.block;
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
    const inView = drones.filter(
      (d) => d.pos.x > width * 0.55 && d.pos.x < width * 0.88 && d.pos.y > height * 0.2 && d.pos.y < height * 0.62,
    );
    const pool = inView.length ? inView : drones;
    spoofer = pool[Math.floor(Math.random() * pool.length)];
    const side = Math.random() < 0.5 ? 1 : -1;
    ghostDir = { x: -Math.sin(spoofer.heading) * side, y: Math.cos(spoofer.heading) * side };
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
        const v = Math.min(d.speed * dt, dist);
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

  function glyph(p: Vec, heading: number, size: number, filled: boolean) {
    ctx!.save();
    ctx!.translate(p.x, p.y);
    ctx!.rotate(heading);
    ctx!.beginPath();
    ctx!.moveTo(size * 1.3, 0);
    ctx!.lineTo(-size, size * 0.85);
    ctx!.lineTo(-size * 0.45, 0);
    ctx!.lineTo(-size, -size * 0.85);
    ctx!.closePath();
    if (filled) ctx!.fill();
    else ctx!.stroke();
    ctx!.restore();
  }

  function label(text: string, p: Vec, color: string, alpha = 1) {
    withAlpha(color, alpha, ctx!, () => {
      ctx!.font = `500 9.5px ${MONO}`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(p.x + 5, p.y - 5);
      ctx!.lineTo(p.x + 12, p.y - 12);
      ctx!.stroke();
      ctx!.fillText(text, p.x + 15, p.y - 14);
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
        withAlpha(palette.track, 0.28, c, () => {
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
        ? { x: p.x + ghostDir.x * GHOST_DISTANCE * ghostAmount, y: p.y + ghostDir.y * GHOST_DISTANCE * ghostAmount }
        : p;

      // Remote ID broadcast ring: the spoofer's rings come from the position it claims.
      const r = 4 + d.pulse * 20;
      withAlpha(isSpoofer ? palette.threat : palette.secure, (1 - d.pulse) * 0.45 * (isSpoofer ? fade : 1), c, () => {
        c.lineWidth = 1;
        c.beginPath();
        c.arc(ghost.x, ghost.y, r, 0, Math.PI * 2);
        c.stroke();
      });

      withAlpha(palette.track, 1, c, () => glyph(p, d.heading, 4.2, true));

      if (isSpoofer && ghostAmount > 0.02) {
        withAlpha(palette.threat, fade, c, () => {
          c.lineWidth = 1.2;
          c.setLineDash([3, 3]);
          c.beginPath();
          c.moveTo(p.x, p.y);
          c.lineTo(ghost.x, ghost.y);
          c.stroke();
          c.setLineDash([]);
          glyph(ghost, d.heading, 4.6, false);
        });
        label('RID · CLAIMED POSITION', ghost, palette.threat, fade * Math.min(1, ghostAmount * 2));
      }

      if (isSpoofer && phase !== 'spoofing') {
        const grow = phase === 'detected' ? Math.min(1, progress * 4) : 1;
        const radius = (34 + Math.sin(clock * 3) * 2) * grow;
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
        label('SPOOFER LOCALIZED · UNSAFE REGION', { x: p.x + radius * 0.6, y: p.y + radius + 22 }, palette.secure, fade * grow);
      } else if (d.labeled && !isSpoofer) {
        label(`UAS ${String(400 + d.id * 37).slice(0, 3)}`, p, palette.label, 0.9);
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
