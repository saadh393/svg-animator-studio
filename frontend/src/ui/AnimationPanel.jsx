import React, { useEffect, useMemo, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import * as Slider from '@radix-ui/react-slider'
import * as Select from '@radix-ui/react-select'
import { LogIn, Sparkles, LogOut } from 'lucide-react'

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
  // New composite emphasis options mapped to existing engine types
  { key: 'fadeInOut', label: 'Fade In/Out' },
  { key: 'zoomInOut', label: 'Zoom In/Out' },
  { key: 'flyInOut', label: 'Fly In/Out' },
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

  const add = (type) => {
    // Map composite keys to engine-supported animations with sensible defaults
    if (type === 'fadeInOut') {
      // Use opacityLoop
      window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type: 'opacityLoop', props: { min: 0, max: 1, duration: 1200, loop: true } } }))
      return
    }
    if (type === 'zoomInOut') {
      // Use pulse (scale oscillation)
      window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type: 'pulse', props: { freq: 1, duration: 1200 } } }))
      return
    }
    if (type === 'flyInOut') {
      // Add flyIn then flyOut sequentially
      const half = 600
      window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type: 'flyIn', props: { duration: half, start: 0, distance: 120 } } }))
      window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type: 'flyOut', props: { duration: half, start: half, distance: 120 } } }))
      return
    }
    window.dispatchEvent(new CustomEvent('app:add-animation', { detail: { type } }))
  }
  const update = (idx, field, value) => window.dispatchEvent(new CustomEvent('app:update-animation', { detail: { idx, field, value } }))
  const remove = (idx) => window.dispatchEvent(new CustomEvent('app:remove-animation', { detail: { idx } }))

  if (!selectedId) return <div className="text-xs text-gray-500">Select a layer to add animations.</div>

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300"><LogIn size={14}/> <span className="section-title">Entrance</span></div>
        <div className="grid grid-cols-3 gap-2">
          {ENTRANCE.map(a => (
            <button key={a.key} className="btn-ghost text-xs" onClick={() => add(a.key)}>{a.label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300"><Sparkles size={14}/> <span className="section-title">Emphasis</span></div>
        <div className="grid grid-cols-3 gap-2">
          {EMPHASIS.map(a => (
            <button key={a.key} className="btn-ghost text-xs" onClick={() => add(a.key)}>{a.label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-300"><LogOut size={14}/> <span className="section-title">Exit</span></div>
        <div className="grid grid-cols-3 gap-2">
          {EXIT.map(a => (
            <button key={a.key} className="btn-ghost text-xs" onClick={() => add(a.key)}>{a.label}</button>
          ))}
        </div>
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

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <div className="text-xs mb-1">Delay</div>
                <Slider.Root className="relative flex items-center select-none touch-none w-full h-5" min={0} max={5000} step={50} value={[an.start || 0]} onValueChange={(v)=>update(idx,'start', v[0])}>
                  <Slider.Track className="bg-gray-800 relative grow rounded-full h-1">
                    <Slider.Range className="absolute bg-gray-400 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-3 h-3 bg-gray-300 rounded-full" aria-label="Delay" />
                </Slider.Root>
                <div className="text-[10px] text-gray-500 mt-1">{an.start || 0} ms</div>
              </div>
              <div>
                <div className="text-xs mb-1">Duration</div>
                <Slider.Root className="relative flex items-center select-none touch-none w-full h-5" min={100} max={5000} step={50} value={[an.duration || 1000]} onValueChange={(v)=>update(idx,'duration', v[0])}>
                  <Slider.Track className="bg-gray-800 relative grow rounded-full h-1">
                    <Slider.Range className="absolute bg-gray-400 rounded-full h-full" />
                  </Slider.Track>
                  <Slider.Thumb className="block w-3 h-3 bg-gray-300 rounded-full" aria-label="Duration" />
                </Slider.Root>
                <div className="text-[10px] text-gray-500 mt-1">{an.duration || 1000} ms</div>
              </div>

              <div>
                <div className="text-xs mb-1">Easing</div>
                <Select.Root value={an.easing || 'ease'} onValueChange={(v)=>update(idx,'easing', v)}>
                  <Select.Trigger className="input w-full"><Select.Value /></Select.Trigger>
                  <Select.Content className="card p-1">
                    <Select.Viewport>
                      <Select.Item value="ease" className="btn-ghost text-sm">Ease</Select.Item>
                      <Select.Item value="linear" className="btn-ghost text-sm">Linear</Select.Item>
                    </Select.Viewport>
                  </Select.Content>
                </Select.Root>
              </div>
              <div>
                <div className="text-xs mb-1">Repeat</div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost px-2" onClick={()=>update(idx,'repeat', Math.max(0, (an.repeat||0)-1))}>-</button>
                  <input className="input w-16 text-center" type="number" min={0} step={1} value={an.repeat||0} onChange={e=>update(idx,'repeat', Math.max(0, parseInt(e.target.value,10)||0))} />
                  <button className="btn-ghost px-2" onClick={()=>update(idx,'repeat', (an.repeat||0)+1)}>+</button>
                </div>
              </div>

              {['flyIn','flyOut','wipe','spin'].includes(an.type) && (
                <div>
                  <div className="text-xs mb-1">Direction</div>
                  <Select.Root value={an.direction || 'right'} onValueChange={(v)=>update(idx,'direction', v)}>
                    <Select.Trigger className="input w-full"><Select.Value /></Select.Trigger>
                    <Select.Content className="card p-1">
                      <Select.Viewport>
                        {['left','right','top','bottom','cw','ccw'].map(v => (
                          <Select.Item key={v} value={v} className="btn-ghost text-sm">{v}</Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Root>
                </div>
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
              {['flyIn','flyOut'].includes(an.type) && (
                <label className="text-xs">Distance
                  <input className="input w-full" type="number" value={an.distance || 200} onChange={e=>update(idx,'distance', parseInt(e.target.value,10)||200)} />
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
