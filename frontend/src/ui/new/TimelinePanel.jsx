import { useMemo } from "react";

const TRACKS = [
  { path: "transform.x", label: "Position X" },
  { path: "transform.y", label: "Position Y" },
  { path: "transform.rotation", label: "Rotation" },
  { path: "transform.scaleX", label: "Scale X" },
  { path: "transform.scaleY", label: "Scale Y" },
  { path: "style.opacity", label: "Opacity" },
  { path: "style.strokeWidth", label: "Stroke Width" },
  { path: "style.strokeDashoffset", label: "Dash Offset" },
];

export default function TimelinePanel({ state, dispatch, EditorActions: Actions }) {
  const duration = state.document.timeline.duration;
  const selected = state.selection[0];
  const element = selected ? state.elements[selected] : null;
  const tracks = useMemo(() => TRACKS, []);

  const currentTime = state.timeline.time;

  return (
    <div className="border-t border-slate-800 bg-slate-900/80">
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-300">
        <label className="flex items-center gap-2">
          Time
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => dispatch(Actions.setTime(parseInt(e.target.value, 10)))}
            className="w-48"
          />
        </label>
        <input
          type="number"
          value={Math.round(currentTime)}
          onChange={(e) => dispatch(Actions.setTime(parseInt(e.target.value, 10) || 0))}
          className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
        />
        <span>{(currentTime / 1000).toFixed(2)}s</span>
        <div className="flex items-center gap-2">
          <span>Duration</span>
          <input
            type="number"
            value={duration}
            onChange={(e) =>
              dispatch(
                Actions.setDocument({
                  timeline: { ...state.document.timeline, duration: parseInt(e.target.value, 10) || duration },
                })
              )
            }
            className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <span>FPS</span>
          <input
            type="number"
            min={1}
            max={60}
            value={state.document.timeline.fps}
            onChange={(e) =>
              dispatch(
                Actions.setDocument({
                  timeline: { ...state.document.timeline, fps: parseInt(e.target.value, 10) || 24 },
                })
              )
            }
            className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
          />
        </div>
      </div>
      <div className="border-t border-slate-800">
        {element ? (
          <div className="max-h-48 overflow-auto">
            {tracks.map((track) => {
              const list = element.keyframes?.[track.path] || [];
              return (
                <div key={track.path} className="border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>{track.label}</span>
                    <button
                      className="text-sky-300 text-[10px] uppercase tracking-wide"
                      onClick={() =>
                        dispatch(
                          Actions.addKeyframe(element.id, track.path, {
                            time: currentTime,
                            value: getValueByPath(element, track.path),
                            easing: "linear",
                          })
                        )
                      }
                    >
                      Add keyframe
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {list.length === 0 && <span className="text-slate-500">No keyframes</span>}
                    {list
                      .slice()
                      .sort((a, b) => a.time - b.time)
                      .map((kf) => (
                        <div key={kf.id} className="bg-slate-800 rounded px-2 py-1 flex items-center gap-2">
                          <span>{Math.round(kf.time)}ms</span>
                          <input
                            type="number"
                            value={kf.time}
                            onChange={(e) =>
                              dispatch(
                                Actions.updateKeyframe(element.id, track.path, kf.id, {
                                  time: parseInt(e.target.value, 10) || 0,
                                })
                              )
                            }
                            className="w-20 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-100"
                          />
                          <select
                            value={kf.easing || "linear"}
                            onChange={(e) =>
                              dispatch(
                                Actions.updateKeyframe(element.id, track.path, kf.id, {
                                  easing: e.target.value,
                                })
                              )
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
                          >
                            <option value="linear">Linear</option>
                            <option value="ease-in">Ease In</option>
                            <option value="ease-out">Ease Out</option>
                            <option value="ease-in-out">Ease In-Out</option>
                          </select>
                          <button
                            className="text-red-300 text-[10px] uppercase"
                            onClick={() => dispatch(Actions.removeKeyframe(element.id, track.path, kf.id))}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-xs text-slate-500">Select an element to edit keyframes.</div>
        )}
      </div>
    </div>
  );
}

const getValueByPath = (element, path) => path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), element);
