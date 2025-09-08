import React, { useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'

export default function UploadDropzone({ onFile }) {
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)

  const onDrop = useCallback(async (accepted) => {
    if (!accepted?.[0]) return
    const f = accepted[0]
    setFile(Object.assign(f, { preview: URL.createObjectURL(f) }))
    // fake progress while reading
    setProgress(10)
    const reader = new FileReader()
    reader.onloadstart = () => setProgress(20)
    reader.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.min(90, Math.round((e.loaded / e.total) * 90)))
    }
    reader.onload = () => { setProgress(100); onFile && onFile(f) }
    reader.readAsArrayBuffer(f)
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/svg+xml': ['.svg'] } })

  const reset = () => { setFile(null); setProgress(0) }

  return (
    <div className={`border-2 border-dashed rounded-xl p-6 text-center transition ${isDragActive ? 'border-gray-500 bg-gray-900/60' : 'border-gray-800 bg-gray-900/40'}`} {...getRootProps()}>
      <input {...getInputProps()} />
      {!file && (
        <div className="space-y-2">
          <div className="text-gray-300">Drag & drop your SVG here</div>
          <div className="text-xs text-gray-500">or click to browse</div>
        </div>
      )}
      {file && (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <div className="text-sm truncate max-w-[240px]" title={file.name}>{file.name}</div>
            <button type="button" className="btn-ghost text-xs" onClick={(e)=>{ e.stopPropagation(); reset() }}>Replace</button>
          </div>
          <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gray-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs text-gray-500">{progress}%</div>
        </div>
      )}
    </div>
  )
}

