import React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function Topbar({ onPlayToggle, playing }) {
  const triggerExport = (fmt) => {
    window.dispatchEvent(new CustomEvent('app:export', { detail: { fmt } }))
  }
  const setFps = (v) => window.dispatchEvent(new CustomEvent('app:update-fps', { detail: { fps: v } }))
  return (
    <header className="toolbar sticky top-0 z-20 h-12 flex items-center justify-between px-3">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <div className="font-semibold">Editor</div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="btn-ghost">FPS</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="card p-1 mt-2">
            {[15,24,30].map(v => (
              <DropdownMenu.Item key={v} className="btn-ghost w-full justify-start" onSelect={() => setFps(v)}>{v} fps</DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        <button className="btn-ghost" onClick={onPlayToggle}>{playing ? 'Pause' : 'Play'}</button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="btn-primary">Export</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content className="card p-1 mt-2">
            <DropdownMenu.Item className="btn-ghost w-full justify-start" onSelect={() => triggerExport('gif')}>GIF</DropdownMenu.Item>
            <DropdownMenu.Item className="btn-ghost w-full justify-start" onSelect={() => triggerExport('webp')}>WebP</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
