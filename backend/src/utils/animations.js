export function computeElementState(element, t) {
  let opacity = element.opacity ?? 1;
  let scale = element.scale ?? 1;

  for (const anim of element.animations || []) {
    const { type, start = 0, duration, loop = false } = anim;
    if (t < start) continue;
    let localT = t - start;
    if (!loop && localT > duration) continue;
    if (loop && duration > 0) {
      localT = localT % duration;
    }
    const p = Math.min(1, Math.max(0, duration ? localT / duration : 1));

    switch (type) {
      case 'fadeIn': {
        const val = p; // 0 -> 1
        opacity *= val;
        break;
      }
      case 'fadeOut': {
        const val = 1 - p; // 1 -> 0
        opacity *= val;
        break;
      }
      case 'opacityLoop': {
        const min = anim.min ?? 0;
        const max = anim.max ?? 1;
        const osc = 0.5 + 0.5 * Math.sin((localT / (duration || 1)) * Math.PI * 2);
        const val = min + (max - min) * osc;
        opacity *= val;
        break;
      }
      case 'shrink': {
        const val = 1 - p; // 1 -> 0
        scale *= val;
        break;
      }
    }
  }

  return { opacity: clamp(opacity, 0, 1), scale: Math.max(scale, 0) };
}

export function computeTotalDurationMs(doc) {
  if (doc.durationMs) return doc.durationMs;
  let maxEnd = 0;
  for (const el of doc.elements || []) {
    for (const a of el.animations || []) {
      const end = (a.start || 0) + a.duration;
      if (end > maxEnd) maxEnd = end;
    }
  }
  return Math.max(maxEnd, 1000);
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

