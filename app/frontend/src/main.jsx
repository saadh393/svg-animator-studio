import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import SvgEditor from './pages/SvgEditor.jsx'

const router = createBrowserRouter([
  { path: '/', element: <SvgEditor /> }
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
