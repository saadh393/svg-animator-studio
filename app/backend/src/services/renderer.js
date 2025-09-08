import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { createCanvas } from 'canvas';
import { loadAnyImage, measureText } from '../utils/image.js';
import { computeElementState, computeTotalDurationMs } from '../utils/animations.js';

export async function renderFrames(doc, workDir) {
  const width = doc.width;
  const height = doc.height;
  const fps = doc.fps || 24;
  const totalMs = computeTotalDurationMs(doc);
  const dt = 1000 / fps;

  const framesDir = path.join(workDir, 'frames');
  const uniqueDir = path.join(workDir, 'unique');
  await fs.ensureDir(framesDir);
  await fs.ensureDir(uniqueDir);

  // Preload images
  const imageCache = new Map();
  for (const el of doc.elements) {
    if (el.type === 'image') {
      imageCache.set(el.id, loadAnyImage(el.src));
    }
  }
  const resolvedImages = new Map();
  for (const [id, p] of imageCache.entries()) {
    resolvedImages.set(id, await p);
  }

  let uniqueIdx = 0;
  let lastHash = null;
  let runDurationMs = 0;
  const entries = [];

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.patternQuality = 'best';
  ctx.quality = 'best';
  ctx.antialias = 'subpixel';

  const frameCount = Math.max(1, Math.round(totalMs / dt));
  for (let i = 0; i < frameCount; i++) {
    const t = Math.min(i * dt, totalMs);
    // Clear with transparent or backgroundColor
    ctx.clearRect(0, 0, width, height);
    if (doc.backgroundColor) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = doc.backgroundColor;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    for (const el of doc.elements) {
      const { opacity, scale } = computeElementState(el, t);
      if (opacity <= 0 || scale <= 0) continue;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(el.x, el.y);
      ctx.scale(scale, scale);

      if (el.type === 'shape') {
        ctx.fillStyle = el.fill || '#ffffff';
        if (el.shapeType === 'circle') {
          const r = el.radius || Math.min(el.width || 50, el.height || 50) / 2;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const w = el.width || 100; const h = el.height || 100;
          ctx.fillRect(-w / 2, -h / 2, w, h);
        }
      } else if (el.type === 'text') {
        ctx.fillStyle = el.style?.color || '#ffffff';
        ctx.font = el.style?.font || 'bold 40px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.content, 0, 0);
      } else if (el.type === 'image') {
        const img = resolvedImages.get(el.id);
        const w = el.width || img?.width || 100;
        const h = el.height || img?.height || 100;
        if (img) {
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        }
      }

      ctx.restore();
    }

    const buf = canvas.toBuffer('image/png');
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await fs.writeFile(framePath, buf);

    if (hash === lastHash) {
      runDurationMs += dt;
    } else {
      // finalize previous unique entry
      if (lastHash !== null) {
        entries[entries.length - 1].duration += runDurationMs / 1000;
      }
      // start new run
      const uniquePath = path.join(uniqueDir, `u_${String(uniqueIdx++).padStart(4, '0')}.png`);
      await fs.copy(framePath, uniquePath);
      entries.push({ file: uniquePath, duration: dt / 1000 });
      lastHash = hash;
      runDurationMs = 0;
    }
  }
  // finalize last
  if (entries.length) {
    entries[entries.length - 1].duration += runDurationMs / 1000;
  }

  // concat demuxer list with per-frame durations
  const framesTxt = path.join(workDir, 'frames.txt');
  const lines = [];
  for (const e of entries) {
    lines.push(`file '${e.file.replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${Math.max(e.duration, 1 / fps)}`);
  }
  // For concat demuxer, last file is repeated without duration to ensure last duration applies
  if (entries.length) {
    lines.push(`file '${entries[entries.length - 1].file.replace(/'/g, "'\\''")}'`);
  }
  await fs.writeFile(framesTxt, lines.join('\n'));

  return { frameCount, framesTxt, uniqueFramesDir: uniqueDir };
}

