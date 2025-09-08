import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as PIXI from 'pixi.js'

const defaultDoc = {
  width: 800,
  height: 600,
  fps: 24,
  durationMs: 3000,
  elements: [
    {
      id: 'title', type: 'text', content: 'LogicBase Labs', x: 400, y: 200,
      style: { font: 'bold 40px Arial', color: '#ffffff' },
      animations: [
        { type: 'fadeIn', start: 0, duration: 1000 },
        { type: 'opacityLoop', start: 1000, duration: 1000, min: 0.5, max: 1 }
      ]
    },
    { id: 'rect', type: 'shape', shapeType: 'rect', x: 400, y: 350, width: 300, height: 120, fill: '#00c2ff', animations: [ { type: 'shrink', start: 1500, duration: 1200 } ] }
  ]
}

function computeState(el, t) {
  let opacity = el.opacity ?? 1; let scale = el.scale ?? 1
  for (const a of el.animations || []) {
    let { type, start = 0, duration, loop } = a
    if (t < start) continue
    let lt = t - start
    if (!loop && lt > duration) continue
    if (loop && duration > 0) lt = lt % duration
    const p = Math.min(1, Math.max(0, duration ? lt / duration : 1))
    if (type === 'fadeIn') opacity *= p
    if (type === 'fadeOut') opacity *= (1 - p)
    if (type === 'opacityLoop') {
      const min = a.min ?? 0, max = a.max ?? 1
      const osc = 0.5 + 0.5 * Math.sin((lt / (duration || 1)) * Math.PI * 2)
      opacity *= (min + (max - min) * osc)
    }
    if (type === 'shrink') scale *= (1 - p)
  }
  return { opacity: Math.max(0, Math.min(1, opacity)), scale: Math.max(0, scale) }
}

export default function EditorPage() {
  const [doc, setDoc] = useState(defaultDoc)
  const [playing, setPlaying] = useState(true)
  const [now, setNow] = useState(0)
  const appRef = useRef(null)
  const containerRef = useRef(null)
  const spritesRef = useRef(new Map())

  const totalMs = useMemo(() => doc.durationMs || Math.max(1000, Math.max(...doc.elements.flatMap(e => e.animations?.map(a => (a.start || 0) + a.duration) || [0]))), [doc])

  useEffect(() => {
    const app = new PIXI.Application({ width: doc.width, height: doc.height, backgroundAlpha: 0, antialias: true })
    appRef.current = app
    containerRef.current.appendChild(app.view)

    // Create stage content
    const stage = app.stage
    stage.removeChildren()

    for (const el of doc.elements) {
      let node
      if (el.type === 'shape') {
        const g = new PIXI.Graphics()
        if (el.shapeType === 'circle') {
          const r = el.radius || Math.min(el.width || 50, el.height || 50) / 2
          g.beginFill(PIXI.utils.string2hex(el.fill || '#ffffff'))
          g.drawCircle(0, 0, r)
          g.endFill()
        } else {
          const w = el.width || 100, h = el.height || 100
          g.beginFill(PIXI.utils.string2hex(el.fill || '#ffffff'))
          g.drawRect(-w/2, -h/2, w, h)
          g.endFill()
        }
        node = g
      } else if (el.type === 'text') {
        const style = new PIXI.TextStyle({ fill: el.style?.color || '#ffffff', fontFamily: (el.style?.font || 'bold 40px Arial'), fontSize: parseInt((el.style?.font || '40').match(/(\d+)/)?.[0] || '40', 10), fontWeight: /bold/i.test(el.style?.font || '') ? 'bold' : 'normal' })
        node = new PIXI.Text(el.content, style)
        node.anchor.set(0.5)
      } else if (el.type === 'image') {
        node = new PIXI.Sprite(PIXI.Texture.from(el.src))
        node.anchor.set(0.5)
        if (el.width && el.height) {
          node.width = el.width; node.height = el.height
        }
      }
      if (!node) continue
      node.x = el.x; node.y = el.y
      stage.addChild(node)
      spritesRef.current.set(el.id, node)
    }

    let raf
    let start = performance.now()
    const tick = () => {
      if (playing) {
        const t = (performance.now() - start) % totalMs
        setNow(t)
        for (const el of doc.elements) {
          const st = computeState(el, t)
          const sp = spritesRef.current.get(el.id)
          if (!sp) continue
          sp.alpha = st.opacity
          sp.scale.set(st.scale)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      spritesRef.current.clear()
      app.destroy(true)
      appRef.current = null
      containerRef.current.innerHTML = ''
    }
  }, [doc.width, doc.height, doc.elements, totalMs, playing])

  const addText = () => {
    const id = `text_${Date.now()}`
    setDoc(d => ({...d, elements: [...d.elements, { id, type:'text', content:'New Text', x: d.width/2, y: d.height/2, style:{ font:'bold 32px Arial', color:'#ffffff' }, animations: [] }]}))
  }
  const addRect = () => {
    const id = `rect_${Date.now()}`
    setDoc(d => ({...d, elements: [...d.elements, { id, type:'shape', shapeType:'rect', x: d.width/2, y: d.height/2, width:150, height:100, fill:'#ff5577', animations: [] }]}))
  }
  const addCircle = () => {
    const id = `circle_${Date.now()}`
    setDoc(d => ({...d, elements: [...d.elements, { id, type:'shape', shapeType:'circle', x: d.width/2, y: d.height/2, radius:60, fill:'#33dd88', animations: [] }]}))
  }
  const addImage = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      const id = `img_${Date.now()}`
      setDoc(d => ({...d, elements: [...d.elements, { id, type:'image', src: reader.result, x: d.width/2, y: d.height/2, width:200, height:200, animations: [] }]}))
    }
    reader.readAsDataURL(file)
  }

  const addAnimation = (elId, type) => {
    setDoc(d => ({...d, elements: d.elements.map(e => e.id === elId ? { ...e, animations: [...(e.animations||[]), { type, start: 0, duration: 1000 }] } : e)}))
  }

  const updateDocMeta = (updates) => setDoc(d => ({...d, ...updates}))

  const onExport = async (fmt) => {
    const endpoint = fmt === 'webp' ? '/api/export/webp' : '/api/export/gif'
    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc) })
    if (!resp.ok) { alert('Export failed'); return }
    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fmt === 'webp' ? 'animation.webp' : 'animation.gif'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'grid', gridTemplateColumns:'280px 1fr 320px', height:'100%' }}>
      <div style={{ padding:12, borderRight:'1px solid #ddd', overflow:'auto' }}>
        <h3>Elements</h3>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
          <button onClick={addText}>Add Text</button>
          <button onClick={addRect}>Add Rect</button>
          <button onClick={addCircle}>Add Circle</button>
          <label style={{ display:'inline-block' }}>
            <span style={{ border:'1px solid #ccc', padding:'4px 8px', cursor:'pointer' }}>Add Image</span>
            <input type="file" accept="image/*,.svg" onChange={e => e.target.files[0] && addImage(e.target.files[0])} style={{ display:'none' }} />
          </label>
        </div>
        <ul>
          {doc.elements.map(e => (
            <li key={e.id} style={{ marginBottom:8 }}>
              <div style={{ fontWeight:'600' }}>{e.id} <small>({e.type})</small></div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
                <button onClick={() => addAnimation(e.id, 'fadeIn')}>+ fadeIn</button>
                <button onClick={() => addAnimation(e.id, 'fadeOut')}>+ fadeOut</button>
                <button onClick={() => addAnimation(e.id, 'opacityLoop')}>+ opacityLoop</button>
                <button onClick={() => addAnimation(e.id, 'shrink')}>+ shrink</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
          <span>t={now.toFixed(0)}ms / {totalMs}ms</span>
        </div>
        <div ref={containerRef} style={{ outline:'1px solid #ddd', width:doc.width, height:doc.height, background:'transparent' }} />
      </div>

      <div style={{ padding:12, borderLeft:'1px solid #ddd', overflow:'auto' }}>
        <h3>Project</h3>
        <label>Width <input type="number" value={doc.width} onChange={e => updateDocMeta({ width: parseInt(e.target.value, 10) || 1 })} /></label>
        <br/>
        <label>Height <input type="number" value={doc.height} onChange={e => updateDocMeta({ height: parseInt(e.target.value, 10) || 1 })} /></label>
        <br/>
        <label>FPS <input type="number" value={doc.fps} onChange={e => updateDocMeta({ fps: parseInt(e.target.value, 10) || 1 })} /></label>
        <br/>
        <label>Duration (ms) <input type="number" value={doc.durationMs} onChange={e => updateDocMeta({ durationMs: parseInt(e.target.value, 10) || 1000 })} /></label>
        <div style={{ marginTop:12, display:'flex', gap:8 }}>
          <button onClick={() => onExport('gif')}>Export GIF</button>
          <button onClick={() => onExport('webp')}>Export WebP</button>
        </div>
        <div style={{ marginTop:12 }}>
          <h4>JSON</h4>
          <textarea rows={18} style={{ width:'100%' }} value={JSON.stringify(doc, null, 2)} onChange={e => { try { setDoc(JSON.parse(e.target.value)) } catch { } }} />
        </div>
      </div>
    </div>
  )
}

