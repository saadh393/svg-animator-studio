import React, { useEffect, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

export default function PropertiesPanel({ selectedId }) {
  const [fill, setFill] = useState('#ffffff')
  const [stroke, setStroke] = useState('')
  const [strokeWidth, setStrokeWidth] = useState(0)
  const [opacity, setOpacity] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!selectedId) return
    const root = document.querySelector('#root')?.ownerDocument
    const svg = document.querySelector('svg')
    const node = svg ? svg.querySelector(`#${CSS.escape(selectedId)}`) : null
    if (!node) return
    setFill(node.getAttribute('fill') || '#ffffff')
    setStroke(node.getAttribute('stroke') || '')
    setStrokeWidth(parseFloat(node.getAttribute('stroke-width') || '0') || 0)
    setOpacity(parseFloat(node.style.opacity || node.getAttribute('opacity') || '1') || 1)
    const t = node.getAttribute('transform') || ''
    const r = /rotate\(([-\d\.]+)/.exec(t); setRotate(r ? parseFloat(r[1]) : 0)
    const s = /scale\(([-\d\.]+)/.exec(t); setScale(s ? parseFloat(s[1]) : 1)
  }, [selectedId])

  const emit = (props) => window.dispatchEvent(new CustomEvent('app:update-prop', { detail: { id: selectedId, props } }))

  if (!selectedId) return <div className="text-xs text-gray-500">Select a layer to edit properties.</div>

  return (
    <div className="space-y-4">
      <div>
        <div className="label mb-1">Fill Color</div>
        <HexColorPicker color={fill} onChange={(v)=>{ setFill(v); emit({ fill: v }) }} className="!w-full" />
        <div className="mt-2 flex items-center gap-2">
          <input className="input w-full" value={fill} onChange={e=>{ setFill(e.target.value); emit({ fill: e.target.value }) }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label mb-1">Stroke</div>
          <input className="input w-full" placeholder="#000000" value={stroke} onChange={e=>{ setStroke(e.target.value); emit({ stroke: e.target.value }) }} />
        </div>
        <div>
          <div className="label mb-1">Stroke Width</div>
          <input type="number" className="input w-full" value={strokeWidth} min={0} step={0.5} onChange={e=>{ const v=parseFloat(e.target.value)||0; setStrokeWidth(v); emit({ strokeWidth: v }) }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label mb-1">Opacity</div>
          <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={e=>{ const v=parseFloat(e.target.value)||0; setOpacity(v); emit({ opacity: v }) }} className="w-full" />
        </div>
        <div>
          <div className="label mb-1">Scale</div>
          <input type="range" min={0.1} max={3} step={0.05} value={scale} onChange={e=>{ const v=parseFloat(e.target.value)||1; setScale(v); emit({ scale: v }) }} className="w-full" />
        </div>
      </div>
      <div>
        <div className="label mb-1">Rotate</div>
        <input type="range" min={-180} max={180} step={1} value={rotate} onChange={e=>{ const v=parseFloat(e.target.value)||0; setRotate(v); emit({ rotate: v }) }} className="w-full" />
      </div>
    </div>
  )
}

