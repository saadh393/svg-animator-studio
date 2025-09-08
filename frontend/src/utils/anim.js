export function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
export function lerp(a,b,t){ return a + (b-a)*t; }
export function easeInOut(t){ return t<0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
export function hexToRgb(h){ if(!h) return null; let s=h.replace('#',''); if (s.length===3) s=s.split('').map(c=>c+c).join(''); const n=parseInt(s,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
export function rgbToHex(r,g,b){ return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
export function mixColor(a,b,t){ const A=hexToRgb(a)||{r:255,g:255,b:255}; const B=hexToRgb(b)||{r:255,g:255,b:255}; return rgbToHex(Math.round(lerp(A.r,B.r,t)),Math.round(lerp(A.g,B.g,t)),Math.round(lerp(A.b,B.b,t))); }

export function computeState(el, t){
  let opacity = el.opacity ?? 1; let scale=el.scale ?? 1; let rot=0; let tx=0; let ty=0; let fill=null; let stroke=null; let clipProg=null;
  for (const a of el.animations||[]) {
    const start = a.start||0; const duration=a.duration||1000; const loop=!!a.loop; const dir=a.direction||'right'; const repeat = Number.isFinite(a.repeat)?a.repeat:(Number.isFinite(a.repeats)?a.repeats:null)
    if (t < start) continue; let lt=t-start; const total = (repeat && repeat>1) ? duration*repeat : duration; if(!loop && lt>total) continue; if((loop || (repeat&&repeat>1)) && duration>0) lt=lt%duration; const p = clamp(duration? lt/duration : 1,0,1); const e = a.easing==='linear'?p:easeInOut(p)
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
      case 'wipe': { clipProg = e; break; }
      case 'colorPulse': { const c1=a.from||'#ffffff', c2=a.to||'#ff4081'; fill = mixColor(c1,c2, (1+Math.sin(p*Math.PI*2))/2 ); break; }
      case 'fontColor': { const c1=a.from||'#ffffff', c2=a.to||'#ff4081'; fill = mixColor(c1,c2,e); break; }
    }
  }
  return { opacity: clamp(opacity,0,1), scale: Math.max(0,scale), rotation: rot, tx, ty, fill, stroke, clipProg }
}
