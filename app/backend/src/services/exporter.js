import { execa } from 'execa';
import ffmpegPath from 'ffmpeg-static';
import fs from 'fs-extra';
import which from 'which';

export async function exportGif({ framesTxt, outPath }) {
  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', framesTxt,
    '-filter_complex',
    // palettegen with transparent reserved and 128 colors, paletteuse with bayer dithering
    "split [a][b]; [a] palettegen=reserve_transparent=1:max_colors=128:stats_mode=diff [p]; [b][p] paletteuse=dither=bayer:bayer_scale=5",
    '-loop', '0',
    outPath
  ];
  await run(ffmpegPath, args);

  // Optional: gifsicle optimize if available
  const gPath = await whichOptional('gifsicle');
  if (gPath) {
    try {
      const tmp = outPath + '.opt.gif';
      await run(gPath, ['--optimize=3', '--colors', '128', '--no-warnings', outPath, '-o', tmp]);
      await fs.move(tmp, outPath, { overwrite: true });
    } catch (e) {
      // ignore optimization errors
    }
  }
}

export async function exportWebp({ framesTxt, outPath }) {
  const args = [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', framesTxt,
    '-c:v', 'libwebp',
    '-lossless', '0',
    '-q:v', '70',
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

