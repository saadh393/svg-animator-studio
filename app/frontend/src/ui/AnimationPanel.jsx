import React, { useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

const ENTRANCE = [
  { key: 'fadeIn', label: 'Fade In' },
  { key: 'flyIn', label: 'Fly In' },
  { key: 'zoom', label: 'Zoom' },
  { key: 'grow', label: 'Grow' },
]
const EMPHASIS = [
  { key: 'pulse', label: 'Pulse' },
  { key: 'bounce', label: 'Bounce' },
  { key: 'spin', label: 'Spin' },
  { key: 'colorPulse', label: 'Color Pulse' },
  { key: 'fontColor', label: 'Font Color' },
]
const EXIT = [
  { key: 'fadeOut', label: 'Fade Out' },
  { key: 'flyOut', label: 'Fly Out' },
  { key: 'shrink', label: 'Shrink' },
  { key: 'wipe', label: 'Wipe' },
]
const PATHS = [
  { key: 'movePath', label: 'Custom Path' },
]

export default function AnimationPanel({ selectedId }) {
  const [list, setList] = useState([])

  useEffect(() => {
    const h = (e) => {
      const { id, list } = e.detail || {}
      if (id && id === selectedId) setList(Array.isArray(list) ? list : [])
    }
    window.addEventListener('app:animations-changed', h)
    return () => window.removeEventListener('app:animations-changed', h)
  }, [selectedId])

  // On selection change, clear to avoid showing stale lists and request the fresh one
  useEffect(() => {
    setList([])
    if (selectedId) {
      window.dispatchEvent(new CustomEvent('app:request-animations', { detail: { id: selectedId } }))
    }
  }, [selectedId])

  const add = (type) => window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type } }))
  const update = (idx, field, value) => window.dispatchEvent(new CustomEvent('app:update-animation', { detail: { idx, field, value } }))
  const remove = (idx) => window.dispatchEvent(new CustomEvent('app:remove-animation', { detail: { idx } }))

  if (!selectedId) return <div className="text-xs text-gray-500">Select a layer to add animations.</div>

  return (
    <div className="space-y-4">
      <div className="section-title">Add Animation</div>
      <div className="grid grid-cols-3 gap-2">
        {[ENTRANCE, EMPHASIS, EXIT, PATHS].flat().map(a => (
          <button key={a.key} className="btn-ghost text-xs" onClick={() => add(a.key)}>{a.label}</button>
        ))}
      </div>

      <div className="section-title">Animations</div>
      {list.length === 0 && <div className="text-xs text-gray-500">No animations added yet.</div>}
      <ul className="space-y-2">
        {list.map((an, idx) => (
          <li key={idx} className="card p-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-200">{an.type}</div>
              <button className="btn-ghost text-xs text-red-400" onClick={() => remove(idx)}>Remove</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="text-xs">Start (ms)
                <input className="input w-full" type="number" value={an.start || 0} onChange={e=>update(idx,'start', parseInt(e.target.value,10)||0)} />
              </label>
              <label className="text-xs">Duration (ms)
                <input className="input w-full" type="number" value={an.duration || 1000} onChange={e=>update(idx,'duration', parseInt(e.target.value,10)||1000)} />
              </label>
              <label className="text-xs">Loop
                <input className="ml-2" type="checkbox" checked={!!an.loop} onChange={e=>update(idx,'loop', e.target.checked)} />
              </label>
              <label className="text-xs">Easing
                <select className="input w-full" value={an.easing||'ease'} onChange={e=>update(idx,'easing', e.target.value)}>
                  <option value="ease">Ease</option>
                  <option value="linear">Linear</option>
                </select>
              </label>

              {['flyIn','flyOut','wipe','spin'].includes(an.type) && (
                <label className="text-xs">Direction
                  <select className="input w-full" value={an.direction||'right'} onChange={e=>update(idx,'direction', e.target.value)}>
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
                <label className="text-xs">From
                  <input className="input w-full" type="number" step="0.1" value={an.from ?? 0} onChange={e=>update(idx,'from', parseFloat(e.target.value)||0)} />
                </label>
              )}
              {['zoom','grow','shrink'].includes(an.type) && (
                <label className="text-xs">To
                  <input className="input w-full" type="number" step="0.1" value={an.to ?? 1} onChange={e=>update(idx,'to', parseFloat(e.target.value)||1)} />
                </label>
              )}

              {['pulse'].includes(an.type) && (
                <label className="text-xs">Frequency
                  <input className="input w-full" type="number" step="0.1" value={an.freq || 1} onChange={e=>update(idx,'freq', parseFloat(e.target.value)||1)} />
                </label>
              )}
              {['bounce'].includes(an.type) && (
                <label className="text-xs">Bounces
                  <input className="input w-full" type="number" value={an.bounces || 2} onChange={e=>update(idx,'bounces', parseInt(e.target.value,10)||2)} />
                </label>
              )}

              {['colorPulse','fontColor'].includes(an.type) && (
                <div className="col-span-2">
                  <div className="text-xs mb-1">From/To</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <HexColorPicker color={an.from || '#ffffff'} onChange={(v)=>update(idx,'from', v)} className="!w-full" />
                      <input className="input w-full mt-2" value={an.from || '#ffffff'} onChange={e=>update(idx,'from', e.target.value)} />
                    </div>
                    <div>
                      <HexColorPicker color={an.to || '#ff4081'} onChange={(v)=>update(idx,'to', v)} className="!w-full" />
                      <input className="input w-full mt-2" value={an.to || '#ff4081'} onChange={e=>update(idx,'to', e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {['movePath'].includes(an.type) && (
                <>
                  <label className="text-xs">Path Ref (element id)
                    <input className="input w-full" value={an.pathRef || ''} onChange={e=>update(idx,'pathRef', e.target.value)} />
                  </label>
                  <label className="text-xs">Path (d)
                    <textarea className="input w-full h-16" value={an.path || ''} onChange={e=>update(idx,'path', e.target.value)} />
                  </label>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
