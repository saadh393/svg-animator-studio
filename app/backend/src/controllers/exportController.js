import path from 'path';
import fs from 'fs-extra';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
// Deprecated canvas renderer import left for reference
// import { renderFrames } from '../services/renderer.js';
import { renderFramesPuppeteer } from '../services/rendererPuppeteer.js';
import { exportGif, exportWebp } from '../services/exporter.js';
import { z } from 'zod';

const colorSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional();

const animationSchema = z.object({
  type: z.enum([
    'fadeIn','fadeOut','flash',
    'flyIn','flyOut','wipe',
    'zoom','grow','shrink','bounce','pulse','spin',
    'colorPulse','fontColor',
    'opacityLoop',
    'movePath'
  ]),
  start: z.number().nonnegative().default(0),
  duration: z.number().positive().default(1000),
  loop: z.boolean().optional(),
  easing: z.enum(['linear','ease']).optional(),
  // generic extras used by some animations; all optional
  direction: z.string().optional(),
  distance: z.number().optional(),
  from: z.union([z.number(), z.string()]).optional(),
  to: z.union([z.number(), z.string()]).optional(),
  turns: z.number().optional(),
  bounces: z.number().optional(),
  freq: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  path: z.string().optional(),
  pathRef: z.string().optional()
});

const svgElementAnim = z.object({
  id: z.string(),
  animations: z.array(animationSchema).default([])
});

const schema = z.object({
  svg: z.string().min(10),
  width: z.number().positive().max(1080),
  height: z.number().positive().max(1080),
  fps: z.number().positive().max(30).default(24),
  durationMs: z.number().positive().optional(),
  elements: z.array(svgElementAnim).default([])
});

export async function exportGifHandler(req, res) {
  try {
    const payload = schema.parse(req.body);
    const jobId = uuidv4();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `anim-${jobId}-`));

    const { frameCount, framesTxt, uniqueFramesDir, width, height } = await renderFramesPuppeteer(payload, tmpDir);

    const outPath = path.join(tmpDir, 'output.gif');
    await exportGif({ framesTxt, outPath, width, height });

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', 'attachment; filename="animation.gif"');
    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on('close', async () => {
      try { await fs.remove(tmpDir); } catch (e) { /* ignore */ }
    });
  } catch (err) {
    console.error('Export GIF error:', err);
    res.status(400).json({ error: err.message || 'Export failed' });
  }
}

export async function exportWebpHandler(req, res) {
  try {
    const payload = schema.parse(req.body);
    const jobId = uuidv4();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `anim-${jobId}-`));

    const { frameCount, framesTxt, width, height } = await renderFramesPuppeteer(payload, tmpDir);
    const outPath = path.join(tmpDir, 'output.webp');
    await exportWebp({ framesTxt, outPath, width, height });

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', 'attachment; filename="animation.webp"');
    const stream = fs.createReadStream(outPath);
    stream.pipe(res);
    stream.on('close', async () => {
      try { await fs.remove(tmpDir); } catch (e) { /* ignore */ }
    });
  } catch (err) {
    console.error('Export WebP error:', err);
    res.status(400).json({ error: err.message || 'Export failed' });
  }
}
