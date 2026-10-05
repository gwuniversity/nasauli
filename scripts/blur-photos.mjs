// Blur photos of people before they enter the repository.
//
//   node scripts/blur-photos.mjs            # private/outreach → src/assets/outreach
//   node scripts/blur-photos.mjs <in> <out> # custom folders
//
// Originals stay in private/ (git-ignored). The whole frame is blurred rather than detected
// faces, so nobody is identifiable by accident while photo consent is pending.
import { mkdir, readdir } from 'node:fs/promises';
import { extname, join, basename } from 'node:path';
import sharp from 'sharp';

const [inDir = 'private/outreach', outDir = 'src/assets/outreach'] = process.argv.slice(2);
const SIGMA = 14;
const MAX_WIDTH = 1600;

await mkdir(outDir, { recursive: true });
const files = (await readdir(inDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));

for (const file of files) {
  const out = join(outDir, `${basename(file, extname(file))}.jpg`);
  await sharp(join(inDir, file))
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .blur(SIGMA)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(out);
  console.log(`blurred ${file} → ${out}`);
}
