import manifest from '~/data/videos.json';

export interface VideoInfo {
  width: number;
  height: number;
  duration: number;
  audio: boolean;
  speed: number;
  bytes: number;
}

const clips = manifest as Record<string, VideoInfo>;

/** Encoded clip metadata (written by scripts/encode-demos.mjs). Throws if the clip was never encoded. */
export function videoInfo(id: string): VideoInfo {
  const info = clips[id];
  if (!info) throw new Error(`Demo video "${id}" is not encoded. Run \`npm run encode-demos\`.`);
  return info;
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
