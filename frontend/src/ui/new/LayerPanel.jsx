import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from "lucide-react";

export default function LayerPanel({ state, dispatch, EditorActions }) {
  const { layers, selection, elements } = state;

  return (
    <div className="border-b border-slate-800 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Layers</h2>
        <button className="icon-btn" title="Add Layer" onClick={() => dispatch(EditorActions.addLayer())}>
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto">
        {layers.map((layer, index) => (
          <div key={layer.id} className="bg-slate-900/60 border border-slate-800 rounded-md p-2">
            <div className="flex items-center gap-2 text-xs">
              <input
                className="bg-transparent border border-slate-700 rounded px-2 py-1 flex-1 text-slate-100"
                value={layer.name}
                onChange={(e) => dispatch(EditorActions.renameLayer(layer.id, e.target.value))}
              />
              <button className="icon-btn" title="Toggle visibility" onClick={() => dispatch(EditorActions.toggleLayerVisibility(layer.id))}>
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button className="icon-btn" title="Lock layer" onClick={() => dispatch(EditorActions.toggleLayerLock(layer.id))}>
                {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
              <button
                className="icon-btn"
                title="Delete layer"
                disabled={layers.length === 1}
                onClick={() => dispatch(EditorActions.deleteLayer(layer.id))}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <button className="icon-btn" disabled={index === 0} onClick={() => dispatch(EditorActions.reorderLayer(layer.id, -1))}>
                <ChevronUp size={14} />
              </button>
              <button className="icon-btn" disabled={index === layers.length - 1} onClick={() => dispatch(EditorActions.reorderLayer(layer.id, 1))}>
                <ChevronDown size={14} />
              </button>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{layer.items.length} items</div>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {layer.items.map((id) => {
                const el = elements[id];
                if (!el) return null;
                const active = selection.includes(id);
                return (
                  <li
                    key={id}
                    className={`px-2 py-1 rounded cursor-pointer ${active ? "bg-sky-500/20 text-sky-200" : "hover:bg-slate-800/80"}`}
                    onClick={() => dispatch(EditorActions.select([id]))}
                  >
                    {el.name}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
