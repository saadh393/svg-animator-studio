import React, { useEffect, useMemo, useRef, useState } from 'react'
import { nanoid } from 'nanoid'
import { computeState, clamp } from '../utils/anim'

const allowedTags = new Set(['g','path','rect','circle','ellipse','line','polyline','polygon','text'])

export default function SvgEditor({ project, onProjectChange, playingExternal, onElementsChange }){
  const [svgText, setSvgText] = useState('')
  const [width, setWidth] = useState(800)
  const [height, setHeight] = useState(600)
  const [fps, setFps] = useState(24)
  const [elements, setElements] = useState([]) // {id, tag}
  const [selected, setSelected] = useState(null)
  const [animations, setAnimations] = useState({}) // id -> [anims]
  const [t, setT] = useState(0)
  const svgRef = useRef(null)

  const totalMs = useMemo(() => {
    let maxEnd = 1000
    for (const id in animations) for (const a of animations[id] || []) maxEnd = Math.max(maxEnd, (a.start||0)+(a.duration||0))
    return maxEnd
  }, [animations])

  // hydrate from provided project on mount/route change
  useEffect(() => {
    if (!project) return
    setSvgText(project.svg || '')
    setWidth(project.width || 800)
    setHeight(project.height || 600)
    setFps(project.fps || 24)
  }, [project?.id])

  useEffect(() => {
    if (!svgText) return
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    const svg = doc.documentElement
    // Ensure width/height stay synced
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))

    // Ensure all actionable nodes have stable IDs; persist them back into svgText once
    const nodes = Array.from(svg.querySelectorAll(Array.from(allowedTags).join(',')))
    let mutated = false
    for (const n of nodes) {
      if (!n.getAttribute('id')) { n.setAttribute('id', `el_${n.tagName}_${nanoid(6)}`); mutated = true }
    }
    if (mutated) {
      // Persist IDs so future renders keep the same mapping
      const serialized = new XMLSerializer().serializeToString(svg)
      setSvgText(serialized)
      return // next effect run will render with persisted ids
    }

    // Collect elements list with stable IDs
    const list = nodes.map(n => ({ id: n.getAttribute('id'), tag: n.tagName }))
    setElements(list)
    if (onElementsChange) onElementsChange(list)

    // Render into host
    const host = svgRef.current
    host.innerHTML = ''
    host.appendChild(host.ownerDocument.importNode(svg, true))
    const root = host.querySelector('svg')
    root.querySelectorAll('[id]').forEach(n => { n.style.transformBox='fill-box'; n.style.transformOrigin='50% 50%'; n.style.willChange='transform,opacity,fill,stroke,clip-path'; n.style.vectorEffect='non-scaling-stroke' })
    const validIds = new Set(list.map(l => l.id))
    const onClick = (e) => {
      const target = e.target.closest('[id]')
      if (!target) return
      const id = target.getAttribute('id')
      if (!validIds.has(id) || id.startsWith('__')) return
      setSelected(id)
      window.dispatchEvent(new CustomEvent('app:selected-changed', { detail: { id } }))
      // Also notify current animations for sidebar sync
      window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id, list: (animations[id] || []) } }))
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [svgText, width, height])

  useEffect(() => {
    let raf
    let start=performance.now()
    const tick = () => {
      if (playingExternal) {
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
          // selection rectangle overlay (no fill, stroke only)
          let selRect = root.querySelector('#__selectionRect')
          if (!selected) {
            if (selRect) selRect.remove()
          } else {
            if (!selRect) {
              selRect = document.createElementNS('http://www.w3.org/2000/svg','rect')
              selRect.setAttribute('id','__selectionRect')
              selRect.setAttribute('fill','none')
              selRect.setAttribute('stroke','#9ca3af')
              selRect.setAttribute('stroke-width','1.5')
              selRect.setAttribute('pointer-events','none')
              selRect.setAttribute('vector-effect','non-scaling-stroke')
              root.appendChild(selRect)
            }
            const sn = root.querySelector(`#${CSS.escape(selected)}`)
            if (sn) {
              const bb = sn.getBBox()
              selRect.setAttribute('x', String(bb.x))
              selRect.setAttribute('y', String(bb.y))
              selRect.setAttribute('width', String(bb.width))
              selRect.setAttribute('height', String(bb.height))
            }
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf=requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playingExternal, elements, animations, totalMs, selected])

  // persist core project fields
  useEffect(() => {
    if (!onProjectChange) return
    onProjectChange({ svg: svgText, width, height, fps })
  }, [svgText, width, height, fps])

  const addAnim = (type) => {
    if (!selected) return
    setAnimations(a => {
      const next = { ...a, [selected]: [...(a[selected]||[]), { type, start:0, duration:1000 }] }
      window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id: selected, list: next[selected] } }))
      return next
    })
  }
  const updateAnim = (idx, field, value) => {
    if (!selected) return
    setAnimations(a => {
      const list = (a[selected]||[]).map((an,i)=> i===idx ? { ...an, [field]: value } : an)
      const next = { ...a, [selected]: list }
      window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id: selected, list } }))
      return next
    })
  }
  const removeAnim = (idx) => {
    if (!selected) return
    setAnimations(a => {
      const list = (a[selected]||[]).filter((_,i)=>i!==idx)
      const next = { ...a, [selected]: list }
      window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id: selected, list } }))
      return next
    })
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

  // External export trigger via topbar
  useEffect(() => {
    const handler = (e) => onExport(e.detail?.fmt || 'gif')
    const selectHandler = (e) => {
      const id = e.detail?.id || null
      setSelected(id)
      if (id) window.dispatchEvent(new CustomEvent('app:selected-changed', { detail: { id } }))
    }
    const updateProps = (e) => {
      const { id, props } = e.detail || {}
      const root = svgRef.current?.querySelector('svg'); if (!root) return
      const node = id ? root.querySelector(`#${CSS.escape(id)}`) : null; if (!node) return
      for (const [k,v] of Object.entries(props||{})) {
        if (k === 'opacity') node.style.opacity = String(v)
        else if (k === 'fill') node.setAttribute('fill', v)
        else if (k === 'stroke') node.setAttribute('stroke', v)
        else if (k === 'strokeWidth') node.setAttribute('stroke-width', String(v))
        else if (k === 'x' || k === 'y' || k === 'transform') node.setAttribute(k, String(v))
        else if (k === 'rotate') {
          const t = node.getAttribute('transform') || ''
          const next = t.replace(/rotate\([^\)]*\)/, '').trim() + ` rotate(${v})`
          node.setAttribute('transform', next.trim())
        } else if (k === 'scale') {
          const t = node.getAttribute('transform') || ''
          const next = t.replace(/scale\([^\)]*\)/, '').trim() + ` scale(${v})`
          node.setAttribute('transform', next.trim())
        }
      }
    }
    const addAnimEv = (e) => { const t = e.detail?.type; if (t) addAnim(t) }
    const updateAnimEv = (e) => { const { idx, field, value } = e.detail || {}; if (typeof idx === 'number') updateAnim(idx, field, value) }
    const removeAnimEv = (e) => { const { idx } = e.detail || {}; if (typeof idx === 'number') removeAnim(idx) }
    const updateFps = (e) => setFps(Math.max(1, Math.min(30, parseInt(e.detail?.fps || 24, 10))))
    const requestAnims = (e) => {
      const id = e.detail?.id || selected
      if (!id) return
      window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id, list: animations[id] || [] } }))
    }
    window.addEventListener('app:export', handler)
    window.addEventListener('app:select', selectHandler)
    window.addEventListener('app:update-prop', updateProps)
    window.addEventListener('app:update-fps', updateFps)
    window.addEventListener('app:add-animation', addAnimEv)
    window.addEventListener('app:update-animation', updateAnimEv)
    window.addEventListener('app:remove-animation', removeAnimEv)
    window.addEventListener('app:request-animations', requestAnims)
    return () => { window.removeEventListener('app:export', handler); window.removeEventListener('app:select', selectHandler); window.removeEventListener('app:update-prop', updateProps); window.removeEventListener('app:update-fps', updateFps); window.removeEventListener('app:add-animation', addAnimEv); window.removeEventListener('app:update-animation', updateAnimEv); window.removeEventListener('app:remove-animation', removeAnimEv); window.removeEventListener('app:request-animations', requestAnims) }
  }, [width, height, fps, elements, animations, selected])

  // Keep sidebar in sync with current selection's animations
  useEffect(() => {
    if (selected) window.dispatchEvent(new CustomEvent('app:animations-changed', { detail: { id: selected, list: animations[selected] || [] } }))
  }, [selected, animations])

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="bg-gray-950 border border-gray-800 rounded-lg" style={{ width, height }}>
        <div ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  )
}
