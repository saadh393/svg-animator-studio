import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listProjects, createProject, saveProject, removeProject } from '../store/projects'
import UploadDropzone from '../ui/UploadDropzone'

export default function Home() {
  const nav = useNavigate()
  const [items, setItems] = useState(listProjects())

  const onUpload = async (file) => {
    const text = await file.text()
    const proj = createProject({ title: file.name.replace(/\.svg$/i, ''), svg: text })
    saveProject(proj)
    nav(`/editor/${proj.id}`)
  }

  const onReopen = (id) => nav(`/editor/${id}`)
  const onRemove = (id) => { removeProject(id); setItems(listProjects()) }

  return (
    <div className="min-h-full flex flex-col">
      <header className="toolbar sticky top-0 z-10 px-4 h-14 flex items-center justify-between">
        <div className="text-sm text-gray-400">SVG Animator</div>
        <button className="btn-primary" onClick={() => nav('/editor')}>New Project</button>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="panel p-6">
              <div className="mb-4 text-lg font-semibold">Upload SVG</div>
              <UploadDropzone onFile={onUpload} />
            </div>
          </div>
          <div className="panel p-6">
            <div className="text-sm text-gray-400">Dark mode only • Tailwind Gray UI</div>
            <div className="text-xs text-gray-500 mt-2">Smooth edges via supersampling and high-quality exports.</div>
          </div>
        </div>

        <div className="mt-8">
          <div className="section-title mb-3">Recent Projects</div>
          {items.length === 0 && (
            <div className="text-gray-500 text-sm">No projects yet. Upload an SVG to get started.</div>
          )}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(p => (
              <div key={p.id} className="card p-3">
                <div className="aspect-video bg-gray-950/50 border border-gray-800 rounded-md overflow-hidden flex items-center justify-center">
                  <img alt={p.title} src={`data:image/svg+xml;utf8,${encodeURIComponent(p.svg || '<svg/>')}`} className="max-w-full max-h-full" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-sm truncate" title={p.title}>{p.title || 'Untitled'}</div>
                  <div className="flex gap-2">
                    <button className="btn-ghost text-xs" onClick={() => onReopen(p.id)}>Reopen</button>
                    <button className="btn-ghost text-xs text-red-400" onClick={() => onRemove(p.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

