export default function HelpOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-3xl text-sm text-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">SVG Animator Studio Help</h2>
          <button className="icon-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          Use the toolbar on the left to draw shapes, paths, and text. Select elements to edit their properties, manage layers,
          and animate attributes on the timeline. Enable grid snapping for precise alignment and preview animations in real-time
          using the playback controls.
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="font-semibold mb-2">Shortcuts</h3>
            <ul className="space-y-1 text-slate-400">
              <li><strong>V</strong> – Select tool</li>
              <li><strong>P</strong> – Pen tool</li>
              <li><strong>H</strong> – Pan tool</li>
              <li><strong>Ctrl/Cmd + Z</strong> – Undo</li>
              <li><strong>Ctrl/Cmd + Shift + Z</strong> – Redo</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Tips</h3>
            <ul className="space-y-1 text-slate-400">
              <li>Use the properties panel to tweak fill, stroke, gradients, and transforms.</li>
              <li>Layer panel allows reordering, locking, and toggling visibility for complex scenes.</li>
              <li>Timeline supports keyframing for transforms, opacity, and stroke details.</li>
              <li>Export GIFs with custom resolution and frame rate from the export panel.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
