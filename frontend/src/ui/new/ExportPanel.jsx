import { useState } from "react";

export default function ExportPanel({ state, dispatch, EditorActions }) {
  const [exporting, setExporting] = useState(false);

  const onExportGif = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const payload = serialize(state);
      const response = await fetch("/api/export/gif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      downloadBlob(blob, "animation.gif");
    } catch (error) {
      console.error(error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <h2 className="text-sm font-semibold text-slate-200">Export</h2>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Frame rate</span>
          <input
            type="number"
            min={1}
            max={60}
            value={state.document.export.frameRate}
            onChange={(e) =>
              dispatch(
                EditorActions.setDocument({
                  export: { ...state.document.export, frameRate: parseInt(e.target.value, 10) || 12 },
                })
              )
            }
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Loop</span>
          <input
            type="checkbox"
            checked={state.document.export.looping}
            onChange={(e) =>
              dispatch(
                EditorActions.setDocument({
                  export: { ...state.document.export, looping: e.target.checked },
                })
              )
            }
          />
        </label>
        <label className="flex flex-col gap-1 col-span-2">
          <span className="text-slate-400">Resolution</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={state.document.export.resolution.width}
              onChange={(e) =>
                dispatch(
                  EditorActions.setDocument({
                    export: {
                      ...state.document.export,
                      resolution: {
                        ...state.document.export.resolution,
                        width: parseInt(e.target.value, 10) || state.document.width,
                      },
                    },
                  })
                )
              }
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 w-20"
            />
            <span>×</span>
            <input
              type="number"
              value={state.document.export.resolution.height}
              onChange={(e) =>
                dispatch(
                  EditorActions.setDocument({
                    export: {
                      ...state.document.export,
                      resolution: {
                        ...state.document.export.resolution,
                        height: parseInt(e.target.value, 10) || state.document.height,
                      },
                    },
                  })
                )
              }
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 w-20"
            />
          </div>
        </label>
      </div>
      <button className="btn w-full" onClick={onExportGif} disabled={exporting}>
        {exporting ? "Exporting…" : "Export GIF"}
      </button>
    </div>
  );
}

const serialize = (state) => {
  const elements = Object.values(state.elements).map((el) => ({
    ...el,
  }));
  return {
    width: state.document.width,
    height: state.document.height,
    fps: state.document.timeline.fps,
    duration: state.document.timeline.duration,
    elements,
    export: state.document.export,
  };
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
