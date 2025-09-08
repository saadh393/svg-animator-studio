import React, { useEffect, useMemo, useRef, useState } from 'react'
import { computeState, clamp } from '../utils/anim'

const allowedTags = new Set(['g','path','rect','circle','ellipse','line','polyline','polygon','text'])

export default function SvgEditor(){
  const [svgText, setSvgText] = useState('')
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [fps, setFps] = useState(24)
  const [elements, setElements] = useState([]) // {id, tag}
  const [selected, setSelected] = useState(null)
  const [animations, setAnimations] = useState({}) // id -> [anims]
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const svgRef = useRef(null)

  const totalMs = useMemo(() => {
    let maxEnd = 1000
    for (const id in animations) for (const a of animations[id] || []) maxEnd = Math.max(maxEnd, (a.start||0)+(a.duration||0))
    return maxEnd
  }, [animations])

  useEffect(() => {
    if (!svgText) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    const svg = doc.documentElement
    // Ensure width/height
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    // Collect elements
    const list = []
    let auto=0
    const assignId = (node) => {
      if (!node.getAttribute('id')) node.setAttribute('id', `el_${auto++}`)
      list.push({ id: node.getAttribute('id'), tag: node.tagName })
    }
    svg.querySelectorAll(Array.from(allowedTags).join(',')).forEach(n => assignId(n))
    setElements(list)
    // Render
    const host = svgRef.current
    host.innerHTML = ''
    host.appendChild(host.ownerDocument.importNode(svg, true))
    const root = host.querySelector('svg')
    root.querySelectorAll('[id]').forEach(n => { n.style.transformBox='fill-box'; n.style.transformOrigin='50% 50%'; n.style.willChange='transform,opacity,fill,stroke,clip-path' })
  }, [svgText, width, height])

  useEffect(() => {
    let raf
    let start=performance.now()
    const tick = () => {
      if (playing) {
        const now = (performance.now()-start) % totalMs
        setT(now)
        const root = svgRef.current?.querySelector('svg')
        if (root) {
          for (const el of elements) {
            const node = root.querySelector(`#${CSS.escape(el.id)}`)
            const st = computeState({ ...el, animations: animations[el.id]||[] }, now)
            if (node) {
              node.style.opacity = String(st.opacity)
              node.style.transform = `translate(${st.tx}px, ${st.ty}px) scale(${st.scale}) rotate(${st.rotation}deg)`
              if (st.fill) node.setAttribute('fill', st.fill)
              if (st.clipProg != null) {
                let defs = root.querySelector('defs'); if(!defs){ defs = document.createElementNS('http://www.w3.org/2000/svg','defs'); root.prepend(defs)}
                let cp = root.querySelector(`#clip_${el.id}`);
                if(!cp){ cp=document.createElementNS('http://www.w3.org/2000/svg','clipPath'); cp.setAttribute('id',`clip_${el.id}`); const r=document.createElementNS('http://www.w3.org/2000/svg','rect'); cp.appendChild(r); defs.appendChild(cp) }
                const bb = node.getBBox(); const r = cp.querySelector('rect'); r.setAttribute('x', String(bb.x)); r.setAttribute('y', String(bb.y)); r.setAttribute('width', String(bb.width*st.clipProg)); r.setAttribute('height', String(bb.height)); node.setAttribute('clip-path', `url(#clip_${el.id})`)
              } else {
                node.removeAttribute('clip-path')
              }
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, elements, animations, totalMs])

  const handleUpload = async (file) => {
    const text = await file.text()
    // Basic strip of script tags
    const cleaned = text.replace(/<script[\s\S]*?<\/script>/gi, '')
    setSvgText(cleaned)
    setAnimations({})
    setSelected(null)
  }

  const addAnim = (type) => {
    if (!selected) return
    setAnimations(a => ({...a, [selected]: [...(a[selected]||[]), { type, start:0, duration:1000 }]}))
  }
  const updateAnim = (idx, field, value) => {
    if (!selected) return
    setAnimations(a => ({...a, [selected]: (a[selected]||[]).map((an,i)=> i===idx ? { ...an, [field]: value } : an)}))
  }
  const removeAnim = (idx) => {
    if (!selected) return
    setAnimations(a => ({...a, [selected]: (a[selected]||[]).filter((_,i)=>i!==idx)}))
  }

  const onExport = async (fmt) => {
    const root = svgRef.current?.querySelector('svg')
    if (!root) { alert('No SVG'); return }
    const composed = root.outerHTML
    const payload = { svg: composed, width, height, fps: clamp(fps,1,30), elements: elements.map(e=>({ id: e.id, animations: animations[e.id]||[] })) }
    const url = fmt==='webp'? '/api/export/webp' : '/api/export/gif'
    const resp = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    if (!resp.ok) { const msg = await resp.text(); alert('Export failed: '+msg); return }
    const blob = await resp.blob(); const a=document.createElement('a'); const href=URL.createObjectURL(blob); a.href=href; a.download= fmt==='webp'? 'animation.webp':'animation.gif'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(href)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 340px', height:'100%' }}>
      <div style={{ padding:12, borderRight:'1px solid #ddd', overflow:'auto' }}>
        <h3>Upload SVG</h3>
        <input type="file" accept=".svg,image/svg+xml" onChange={e=>e.target.files[0] && handleUpload(e.target.files[0])} />
        <div style={{ marginTop:12 }}>
          <label>Width <input type="number" value={width} onChange={e=>setWidth(parseInt(e.target.value,10)||1)} /></label>
          <br/>
          <label>Height <input type="number" value={height} onChange={e=>setHeight(parseInt(e.target.value,10)||1)} /></label>
          <br/>
          <label>FPS <input type="number" value={fps} onChange={e=>setFps(parseInt(e.target.value,10)||24)} /></label>
        </div>
        <h3 style={{ marginTop:16 }}>Layers</h3>
        <ul>
          {elements.map(el => (
            <li key={el.id} onClick={()=>setSelected(el.id)} style={{ cursor:'pointer', background:selected===el.id?'#eef':'transparent', padding:'4px 6px', borderRadius:4 }}>
              {el.tag} <small>#{el.id}</small>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <button onClick={()=>setPlaying(p=>!p)}>{playing?'Pause':'Play'}</button>
          <span>{Math.round(t)}ms / {totalMs}ms</span>
          <button onClick={()=>onExport('gif')}>Export GIF</button>
          <button onClick={()=>onExport('webp')}>Export WebP</button>
        </div>
        <div style={{ outline:'1px solid #ccc', width, height, background:'transparent' }}>
          <div ref={svgRef} />
        </div>
      </div>

      <div style={{ padding:12, borderLeft:'1px solid #ddd', overflow:'auto' }}>
        <h3>Animations</h3>
        {!selected && <div>Select a layer</div>}
        {selected && (
          <div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>addAnim('fadeIn')}>+ Fade In</button>
              <button onClick={()=>addAnim('fadeOut')}>+ Fade Out</button>
              <button onClick={()=>addAnim('flash')}>+ Flash</button>
              <button onClick={()=>addAnim('flyIn')}>+ Fly In</button>
              <button onClick={()=>addAnim('flyOut')}>+ Fly Out</button>
              <button onClick={()=>addAnim('wipe')}>+ Wipe</button>
              <button onClick={()=>addAnim('zoom')}>+ Zoom</button>
              <button onClick={()=>addAnim('shrink')}>+ Shrink</button>
              <button onClick={()=>addAnim('bounce')}>+ Bounce</button>
              <button onClick={()=>addAnim('pulse')}>+ Pulse</button>
              <button onClick={()=>addAnim('spin')}>+ Spin</button>
              <button onClick={()=>addAnim('colorPulse')}>+ Color Pulse</button>
              <button onClick={()=>addAnim('fontColor')}>+ Font Color</button>
            </div>
            <ul style={{ marginTop:12 }}>
              {(animations[selected]||[]).map((an, idx) => (
                <li key={idx} style={{ border:'1px solid #ddd', borderRadius:6, padding:8, marginBottom:8 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <strong>{an.type}</strong>
                    <button onClick={()=>removeAnim(idx)}>Remove</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginTop:8 }}>
                    <label>Start(ms) <input type="number" value={an.start||0} onChange={e=>updateAnim(idx,'start', parseInt(e.target.value,10)||0)} /></label>
                    <label>Duration(ms) <input type="number" value={an.duration||1000} onChange={e=>updateAnim(idx,'duration', parseInt(e.target.value,10)||1000)} /></label>
                    <label>Loop <input type="checkbox" checked={!!an.loop} onChange={e=>updateAnim(idx,'loop', e.target.checked)} /></label>
                    <label>Easing
                      <select value={an.easing||'ease'} onChange={e=>updateAnim(idx,'easing', e.target.value)}>
                        <option value="ease">Ease</option>
                        <option value="linear">Linear</option>
                      </select>
                    </label>
                    {['flyIn','flyOut','wipe','spin'].includes(an.type) && (
                      <label>Direction
                        <select value={an.direction||'right'} onChange={e=>updateAnim(idx,'direction', e.target.value)}>
                          <option>left</option>
                          <option>right</option>
                          <option>top</option>
                          <option>bottom</option>
                          <option>cw</option>
                          <option>ccw</option>
                        </select>
                      </label>
                    )}
                    {['zoom'].includes(an.type) && (
                      <label>From <input type="number" step="0.1" value={an.from??0} onChange={e=>updateAnim(idx,'from', parseFloat(e.target.value)||0)} /></label>
                    )}
                    {['zoom','grow','shrink'].includes(an.type) && (
                      <label>To <input type="number" step="0.1" value={an.to??1} onChange={e=>updateAnim(idx,'to', parseFloat(e.target.value)||1)} /></label>
                    )}
                    {['colorPulse','fontColor'].includes(an.type) && (
                      <label>From <input type="color" value={an.from||'#ffffff'} onChange={e=>updateAnim(idx,'from', e.target.value)} /></label>
                    )}
                    {['colorPulse','fontColor'].includes(an.type) && (
                      <label>To <input type="color" value={an.to||'#ff4081'} onChange={e=>updateAnim(idx,'to', e.target.value)} /></label>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div style={{ marginTop:16 }}>
          <h4>JSON</h4>
          <textarea rows={14} style={{ width:'100%' }} value={JSON.stringify({ svg: svgRef.current?.querySelector('svg')?.outerHTML || '', width, height, fps, elements: elements.map(e=>({ id:e.id, animations: animations[e.id]||[] })) }, null, 2)} readOnly />
        </div>
      </div>
    </div>
  )
}

