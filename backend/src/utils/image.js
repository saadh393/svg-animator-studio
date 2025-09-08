import { createCanvas, loadImage, registerFont } from 'canvas';
import sharp from 'sharp';

export async function loadAnyImage(src) {
  // Handles data URLs, http(s), file, and SVG via sharp rasterization
  if (typeof src !== 'string') throw new Error('Invalid image src');
  if (src.startsWith('data:image/svg')) {
    const buf = Buffer.from(src.split(',')[1], 'base64');
    const raster = await sharp(buf).png().toBuffer();
    return await loadImage(raster);
  }
  if (src.startsWith('data:')) {
    return await loadImage(src);
  }
  if (/^https?:\/\//.test(src)) {
    return await loadImage(src);
  }
  return await loadImage(src);
}

export function measureText(ctx, text, font) {
  ctx.save();
  if (font) ctx.font = font;
  const metrics = ctx.measureText(text);
  ctx.restore();
  const width = metrics.width;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  return { width, height };
}

