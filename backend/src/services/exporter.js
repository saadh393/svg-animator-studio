import { execa } from 'execa';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs-extra';
import which from 'which';

export async function exportGif({ framesTxt, outPath, width, height }) {
  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', framesTxt,
    '-filter_complex',
    // Downscale with high quality (lanczos), then generate/apply palette with full stats and smooth dithering
    `[0:v]${width && height ? `scale=${width}:${height}:flags=lanczos,` : ''}split [a][b];` +
      ` [a] palettegen=reserve_transparent=1:max_colors=256:stats_mode=full [p];` +
      ` [b][p] paletteuse=dither=floyd_steinberg`,
    '-loop', '0',
    outPath
  ];
  await run(ffmpegPath, args);

  // Optional: gifsicle optimize if available
  const gPath = await whichOptional('gifsicle');
  if (gPath) {
    try {
      const tmp = outPath + '.opt.gif';
      // Keep full color palette from ffmpeg (do not downsample colors again)
      await run(gPath, ['--optimize=3', '--no-warnings', outPath, '-o', tmp]);
      await fs.move(tmp, outPath, { overwrite: true });
    } catch (e) {
      // ignore optimization errors
    }
  }
}

export async function exportWebp({ framesTxt, outPath, width, height }) {
  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', framesTxt,
    ...(width && height ? ['-vf', `scale=${width}:${height}:flags=lanczos`] : []),
    '-c:v', 'libwebp',
    '-lossless', '0',
    '-q:v', '90',
    '-compression_level', '6',
    '-pix_fmt', 'yuva420p',
    '-loop', '0',
    outPath
  ];
  await run(ffmpegPath, args);
}

async function run(cmd, args) {
  const { stdout, stderr } = await execa(cmd, args);
  return { stdout, stderr };
}

async function whichOptional(bin) {
  try {
    return which.sync(bin);
  } catch {
    return null;
  }
}
