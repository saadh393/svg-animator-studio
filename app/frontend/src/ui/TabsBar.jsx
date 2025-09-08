import React from 'react'
import * as Tabs from '@radix-ui/react-tabs'

export default function TabsBar({ projects = [], activeId, onChange, onNew }) {
  const current = projects.find(p => p.id === activeId)
  return (
    <Tabs.Root value={activeId || (projects[0]?.id || 'new')} onValueChange={onChange} className="w-full">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-gray-800 bg-gray-900/60">
        <Tabs.List className="flex gap-1 overflow-x-auto">
          {projects.map(p => (
            <Tabs.Trigger key={p.id} value={p.id} className={`px-3 py-1 rounded-md text-sm ${activeId===p.id ? 'bg-gray-800 text-gray-100' : 'text-gray-400 hover:bg-gray-800/70'}`}>{p.title || 'Untitled'}</Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="ml-auto">
          <button className="btn-ghost text-xs" onClick={onNew}>+ New</button>
        </div>
      </div>
    </Tabs.Root>
  )
}

