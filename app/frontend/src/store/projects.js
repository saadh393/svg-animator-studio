import { nanoid } from 'nanoid'

const KEY = 'svg_projects_v1'

export function listProjects() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch { return [] }
}

export function getProject(id) {
  return listProjects().find(p => p.id === id) || null
}

export function saveProject(project) {
  const list = listProjects()
  const idx = list.findIndex(p => p.id === project.id)
  const next = { ...project, updatedAt: Date.now() }
  if (idx >= 0) list[idx] = next; else list.unshift(next)
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))) // cap history
  return next
}

export function removeProject(id) {
  const list = listProjects().filter(p => p.id !== id)
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function createProject({ title = 'Untitled', svg = '', width = 800, height = 600, fps = 24, elements = [], animations = {} } = {}) {
  const id = nanoid(8)
  return { id, title, svg, width, height, fps, elements, animations, createdAt: Date.now(), updatedAt: Date.now() }
}

