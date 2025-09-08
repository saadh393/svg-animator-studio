import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import puppeteer from 'puppeteer';
import { sanitizeSvg } from '../utils/sanitizeSvg.js';

export async function renderFramesPuppeteer(doc, workDir) {
  const width = clamp(doc.width, 1, 1080);
  const height = clamp(doc.height, 1, 1080);
  const fps = clamp(doc.fps || 24, 1, 30);
  const svgRaw = String(doc.svg || '');

  const { svg: safeSvg, nodeCount } = sanitizeSvg(svgRaw);
  if (nodeCount > 5000) throw new Error('SVG too complex');

  const framesDir = path.join(workDir, 'frames');
  const uniqueDir = path.join(workDir, 'unique');
  await fs.ensureDir(framesDir);
  await fs.ensureDir(uniqueDir);

  const totalMs = computeTotalDurationMs(doc);
  const dt = 1000 / fps;
  const frameCount = Math.max(1, Math.round(totalMs / dt));

  // Render at higher device scale for smoother edges, then downscale in export
  const SS = 2; // supersample factor
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width, height },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: SS });

  const html = makeHtml({ width, height, svg: safeSvg, doc });
  await page.setContent(html, { waitUntil: 'load' });

  await page.waitForSelector('#stage svg');

  // Precompute per-element centers to use as transform-origin
  await page.evaluate(() => {
    const root = document.querySelector('#stage svg');
    root.style.transformBox = 'fill-box';
    const nodes = root.querySelectorAll('[id]');
    nodes.forEach(n => {
      n.style.transformBox = 'fill-box';
      n.style.transformOrigin = '50% 50%';
      n.style.willChange = 'transform, opacity, fill, stroke, clip-path';
      n.style.vectorEffect = 'non-scaling-stroke';
    });
  });

  let uniqueIdx = 0;
  let lastHash = null;
  let runDurationMs = 0;
  const entries = [];

  for (let i = 0; i < frameCount; i++) {
    const t = Math.min(i * dt, totalMs);
    await page.evaluate((now) => {
      window.__applyFrame(now);
    }, t);

    const buf = await page.screenshot({ type: 'png', omitBackground: true });
    const hash = crypto.createHash('md5').update(buf).digest('hex');
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await fs.writeFile(framePath, buf);

    if (hash === lastHash) {
      runDurationMs += dt;
    } else {
      if (lastHash !== null) {
        entries[entries.length - 1].duration += runDurationMs / 1000;
      }
      const uniquePath = path.join(uniqueDir, `u_${String(uniqueIdx++).padStart(4, '0')}.png`);
      await fs.copy(framePath, uniquePath);
      entries.push({ file: uniquePath, duration: dt / 1000 });
      lastHash = hash;
      runDurationMs = 0;
    }
  }
  if (entries.length) entries[entries.length - 1].duration += runDurationMs / 1000;

  const framesTxt = path.join(workDir, 'frames.txt');
  const lines = [];
  for (const e of entries) {
    lines.push(`file '${e.file.replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${e.duration}`);
  }
  if (entries.length) lines.push(`file '${entries[entries.length - 1].file.replace(/'/g, "'\\''")}'`);
  await fs.writeFile(framesTxt, lines.join('\n'));

  await browser.close();
  return { frameCount, framesTxt, uniqueFramesDir: uniqueDir, width, height, supersample: SS };
}

function makeHtml({ width, height, svg, doc }) {
  const safeDoc = JSON.stringify({ ...doc, svg: undefined });
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body { margin:0; padding:0; background:transparent; }
        #stage { width:${width}px; height:${height}px; overflow:hidden; background:transparent; }
        svg { width:${width}px; height:${height}px; shape-rendering: geometricPrecision; text-rendering: optimizeLegibility; image-rendering: optimizeQuality; -webkit-font-smoothing: antialiased; }
      </style>
    </head>
    <body>
      <div id="stage">${svg}</div>
      <script>
        const doc = ${safeDoc};
        function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
        function lerp(a,b,t){ return a + (b-a)*t; }
        function easeInOut(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
        function hexToRgb(h){ if(!h) return null; let s=h.replace('#',''); if (s.length===3) s=s.split('').map(c=>c+c).join(''); const n=parseInt(s,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
        function rgbToHex(r,g,b){ return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
        function mixColor(a,b,t){ const A=hexToRgb(a)||{r:255,g:255,b:255}; const B=hexToRgb(b)||{r:255,g:255,b:255}; return rgbToHex(Math.round(lerp(A.r,B.r,t)),Math.round(lerp(A.g,B.g,t)),Math.round(lerp(A.b,B.b,t))); }
        function computeElementState(el,t){
          let opacity = el.opacity ?? 1; let scale=el.scale ?? 1; let rot=0; let tx=0; let ty=0; let fill=null; let stroke=null; let clipProg=null;
          const center = el.__center || {x:0,y:0};
          for (const a of el.animations||[]) {
            const start = a.start||0; const duration = a.duration||1000; const loop = !!a.loop; const dir=a.direction||'right'; const repeat = Number.isFinite(a.repeat)?a.repeat:(Number.isFinite(a.repeats)?a.repeats:null);
            if (t < start) continue; let lt = t - start; const total = (repeat && repeat>1) ? duration*repeat : duration; if (!loop && lt>total) continue; if ((loop || (repeat&&repeat>1)) && duration>0) lt = lt % duration; const p = clamp(duration? lt/duration : 1,0,1); const e = a.easing==='linear' ? p : easeInOut(p);
            switch(a.type){
              case 'fadeIn': opacity *= e; break;
              case 'fadeOut': opacity *= (1-e); break;
              case 'flash': opacity *= (Math.sin(p* Math.PI*6) > 0 ? 1 : 0); break;
              case 'zoom': scale *= lerp(a.from??0, a.to??1, e); break;
              case 'grow': scale *= lerp(1, a.to??1.3, e); break;
              case 'shrink': scale *= lerp(1, a.to??0, e); break;
              case 'pulse': scale *= (1 + 0.1*Math.sin(p*Math.PI*2*(a.freq||1))); break;
              case 'bounce': scale *= (1 + 0.2*Math.abs(Math.sin(p*Math.PI*(a.bounces||2)))); break;
              case 'spin': rot += (a.direction==='ccw'?-1:1) * 360 * p * (a.turns||1); break;
              case 'flyIn': { const d=a.distance||200; const pr=1-e; if(dir==='left') tx+=-d*pr; if(dir==='right') tx+=d*pr; if(dir==='top') ty+=-d*pr; if(dir==='bottom') ty+=d*pr; break; }
              case 'flyOut': { const d=a.distance||200; const pr=e; if(dir==='left') tx+=-d*pr; if(dir==='right') tx+=d*pr; if(dir==='top') ty+=-d*pr; if(dir==='bottom') ty+=d*pr; break; }
              case 'movePath': {
                const path = a.path && document.getElementById(a.pathRef || '') || null;
                const d = a.path || (path ? path.getAttribute('d') : null);
                if (d) {
                  let tmp = document.getElementById('__tmpPath');
                  if(!tmp){ tmp = document.createElementNS('http://www.w3.org/2000/svg','path'); tmp.setAttribute('id','__tmpPath'); tmp.setAttribute('fill','none'); document.querySelector('#stage svg').appendChild(tmp); }
                  tmp.setAttribute('d', d);
                  const len = tmp.getTotalLength(); const pt = tmp.getPointAtLength(len*e);
                  tx += pt.x - (el.__baseX||0); ty += pt.y - (el.__baseY||0);
                }
                break; }
              case 'wipe': { clipProg = e; break; }
              case 'colorPulse': { const c1=a.from||'#ffffff', c2=a.to||'#ff4081'; fill = mixColor(c1,c2, (1+Math.sin(p*Math.PI*2))/2 ); break; }
              case 'fontColor': { const c1=a.from||'#ffffff', c2=a.to||'#ff4081'; fill = mixColor(c1,c2,e); break; }
            }
          }
          return { opacity: clamp(opacity,0,1), scale: Math.max(scale,0), rotation: rot, tx, ty, fill, stroke, clipProg };
        }

        // Prepare clipPaths per element for wipe
        (function setup(){
          const svg = document.querySelector('#stage svg');
          let defs = svg.querySelector('defs'); if(!defs){ defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); svg.prepend(defs); }
          for (const el of doc.elements) {
            const node = document.getElementById(el.id); if (!node) continue;
            const bb = node.getBBox(); el.__baseX = bb.x + bb.width/2; el.__baseY = bb.y + bb.height/2; el.__center = {x: el.__baseX, y: el.__baseY };
            const cpId = 'clip_' + el.id; if (!document.getElementById(cpId)){
              const cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath'); cp.setAttribute('id', cpId);
              const r = document.createElementNS('http://www.w3.org/2000/svg','rect'); r.setAttribute('x', String(bb.x)); r.setAttribute('y', String(bb.y)); r.setAttribute('width', '0'); r.setAttribute('height', String(bb.height)); cp.appendChild(r); defs.appendChild(cp);
            }
          }
        })();

        window.__applyFrame = (now) => {
          const svg = document.querySelector('#stage svg');
          for (const el of doc.elements) {
            const node = document.getElementById(el.id); if (!node) continue;
            const st = computeElementState(el, now);
            node.style.opacity = String(st.opacity);
            node.style.transformBox = 'fill-box';
            node.style.transformOrigin = '50% 50%';
            node.style.transform = 'translate(' + st.tx + 'px, ' + st.ty + 'px) scale(' + st.scale + ') rotate(' + st.rotation + 'deg)';
            if (st.fill) node.setAttribute('fill', st.fill);
            if (st.stroke) node.setAttribute('stroke', st.stroke);
            if (st.clipProg !== null) {
              const bb = node.getBBox();
              const cpId = 'clip_' + el.id; const cp = document.getElementById(cpId); const r = cp && cp.querySelector('rect');
              if (r) { r.setAttribute('x', String(bb.x)); r.setAttribute('y', String(bb.y)); r.setAttribute('width', String(bb.width * st.clipProg)); r.setAttribute('height', String(bb.height)); node.setAttribute('clip-path', 'url(#' + cpId + ')'); }
            } else {
              node.removeAttribute('clip-path');
            }
          }
        };
      </script>
    </body>
  </html>`;
}

function computeTotalDurationMs(doc){
  if (doc.durationMs) return doc.durationMs;
  let maxEnd = 0; for(const el of doc.elements||[]){ for(const a of el.animations||[]){ const end=(a.start||0)+(a.duration||0); if(end>maxEnd) maxEnd=end; } }
  return Math.max(maxEnd, 1000);
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
