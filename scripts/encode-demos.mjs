// Encode the website demo videos from the original files in demos/ (git-ignored).
//
//   npm run encode-demos            # encode clips whose output is missing
//   npm run encode-demos -- --force # re-encode everything
//   npm run encode-demos -- uci-flytrap tsu-slz-tracking   # only these ids
//
// Requires ffmpeg/ffprobe (brew install ffmpeg). Writes public/videos/<id>.mp4 and <id>.jpg:
// H.264 + AAC, at most 1280 px on the long edge, "faststart" so playback begins before the
// download finishes. Loops are silent; players keep audio only when the source has a real track.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SRC = 'demos';
const OUT = 'public/videos';
const MAX_EDGE = 1280;
const { clips } = JSON.parse(readFileSync('scripts/demo-sources.json', 'utf8'));

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.filter((a) => !a.startsWith('--'));
const tmp = mkdtempSync(join(tmpdir(), 'uli-demos-'));
mkdirSync(OUT, { recursive: true });

const run = (cmd, a) => execFileSync(cmd, a, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();

/** Resolve "deck.pptx#ppt/media/x.mp4" by extracting the embedded file once. */
function resolve(source) {
  const [file, member] = source.split('#');
  const path = join(SRC, file);
  if (!existsSync(path)) throw new Error(`missing source: ${path}`);
  if (!member) return path;
  const out = join(tmp, `${file.replace(/\W+/g, '_')}_${member.replace(/\W+/g, '_')}`);
  if (!existsSync(out)) execFileSync('sh', ['-c', `unzip -p "${path}" "${member}" > "${out}"`]);
  return out;
}

function probe(path) {
  const info = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path]));
  const v = info.streams.find((s) => s.codec_type === 'video');
  const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
  return { width: v.width, height: v.height, duration: Number(info.format.duration), hasAudio };
}

/** True when the audio is more than near-silence (screen recordings often carry an empty track). */
function audible(path, start = 0) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-ss', String(start), '-t', '120', '-i', path, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], {
    encoding: 'utf8',
  }).stderr;
  const max = Number(/max_volume: (-?[\d.]+)/.exec(log)?.[1] ?? -91);
  return max > -50;
}

/** Scale so the long edge is at most MAX_EDGE, keeping even dimensions. */
function scaleFilter(w, h) {
  const k = Math.min(1, MAX_EDGE / Math.max(w, h));
  const even = (x) => Math.max(2, Math.round((x * k) / 2) * 2);
  return `scale=${even(w)}:${even(h)}:flags=lanczos`;
}

const videoArgs = (mode) => [
  '-c:v', 'libx264', '-preset', 'slow', '-crf', mode === 'loop' ? '30' : '28',
  '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
];

function encodeSingle(clip, out) {
  const src = resolve(clip.source);
  const meta = probe(src);
  const speed = clip.speed ?? 1;
  let [w, h] = [meta.width, meta.height];
  const filters = [];
  if (clip.crop) {
    filters.push(`crop=${clip.crop}`);
    [w, h] = clip.crop.split(':').map(Number);
  }
  filters.push(scaleFilter(w, h), 'fps=30');
  if (speed !== 1) filters.push(`setpts=PTS/${speed}`);
  const keepAudio = clip.mode === 'player' && speed === 1 && meta.hasAudio && audible(src, clip.start ?? 0);
  const a = ['-y', '-v', 'error'];
  if (clip.start) a.push('-ss', String(clip.start));
  a.push('-i', src);
  if (clip.duration) a.push('-t', String(clip.duration));
  a.push('-vf', filters.join(','), ...videoArgs(clip.mode));
  a.push(...(keepAudio ? ['-c:a', 'aac', '-b:a', '96k', '-ac', '2'] : ['-an']));
  run('ffmpeg', [...a, out]);
  return keepAudio;
}

function encodeMontage(clip, out) {
  const W = 1280;
  const H = 720;
  const inputs = clip.montage.flatMap((m) => ['-ss', String(m.start ?? 0), '-t', String(m.duration), '-i', resolve(m.source)]);
  const parts = clip.montage.map(
    (_, i) => `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,setsar=1[v${i}]`,
  );
  const concat = `${clip.montage.map((_, i) => `[v${i}]`).join('')}concat=n=${clip.montage.length}:v=1:a=0[out]`;
  run('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', [...parts, concat].join(';'), '-map', '[out]', ...videoArgs('loop'), '-an', out]);
  return false;
}

let total = 0;
for (const clip of clips) {
  if (only.length && !only.includes(clip.id)) continue;
  const mp4 = join(OUT, `${clip.id}.mp4`);
  const jpg = join(OUT, `${clip.id}.jpg`);
  if (!force && existsSync(mp4) && existsSync(jpg)) {
    total += statSync(mp4).size;
    continue;
  }
  process.stdout.write(`encoding ${clip.id} … `);
  const audio = clip.montage ? encodeMontage(clip, mp4) : encodeSingle(clip, mp4);
  run('ffmpeg', ['-y', '-v', 'error', '-ss', String(clip.poster ?? 1), '-i', mp4, '-frames:v', '1', '-q:v', '4', jpg]);
  const { duration, width, height } = probe(mp4);
  const size = statSync(mp4).size;
  total += size;
  console.log(`${width}×${height}, ${duration.toFixed(0)} s, ${(size / 1e6).toFixed(1)} MB${audio ? ', audio' : ''}`);
}
console.log(`total: ${(total / 1e6).toFixed(1)} MB`);

// Manifest read by the site at build time (so CI needs no ffmpeg).
const manifest = {};
for (const clip of clips) {
  const mp4 = join(OUT, `${clip.id}.mp4`);
  if (!existsSync(mp4)) continue;
  const m = probe(mp4);
  manifest[clip.id] = {
    width: m.width,
    height: m.height,
    duration: Math.round(m.duration),
    audio: m.hasAudio,
    speed: clip.speed ?? 1,
    bytes: statSync(mp4).size,
  };
}
writeFileSync('src/data/videos.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote src/data/videos.json (${Object.keys(manifest).length} clips)`);
rmSync(tmp, { recursive: true, force: true });
