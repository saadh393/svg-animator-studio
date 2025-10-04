import { useEffect, useMemo, useReducer } from "react";
import { EditorActions, createInitialEditor, editorReducer, evaluateElementAtTime } from "../editorState";
import TopBar from "../ui/new/TopBar";
import Toolbar from "../ui/new/Toolbar";
import CanvasStage from "../ui/new/CanvasStage";
import LayerPanel from "../ui/new/LayerPanel";
import PropertiesInspector from "../ui/new/PropertiesInspector";
import TimelinePanel from "../ui/new/TimelinePanel";
import HelpOverlay from "../ui/new/HelpOverlay";
import ExportPanel from "../ui/new/ExportPanel";

export default function EditorShell() {
  const [state, dispatch] = useReducer(editorReducer, null, createInitialEditor);
  const { present } = state;

  useEffect(() => {
    const handleKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        event.preventDefault();
        dispatch({ type: "UNDO" });
      }
      if ((event.metaKey || event.ctrlKey) && (event.key === "y" || (event.shiftKey && event.key === "Z"))) {
        event.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const animatedElements = useMemo(() => {
    const shouldAnimate = present.ui.playing || present.timeline.time !== 0;
    if (!shouldAnimate) return present.elements;
    const t = present.timeline.time;
    const animated = {};
    for (const [id, el] of Object.entries(present.elements)) {
      animated[id] = evaluateElementAtTime(el, t);
    }
    return animated;
  }, [present.elements, present.timeline.time, present.ui.playing]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      <TopBar state={present} dispatch={dispatch} EditorActions={EditorActions} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-64 border-r border-slate-800 bg-slate-900/60 backdrop-blur-md">
          <LayerPanel state={present} dispatch={dispatch} EditorActions={EditorActions} />
          <ExportPanel state={present} dispatch={dispatch} EditorActions={EditorActions} />
        </aside>
        <div className="flex flex-1 min-w-0 min-h-0">
          <Toolbar state={present} dispatch={dispatch} EditorActions={EditorActions} />
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <CanvasStage
              state={present}
              dispatch={dispatch}
              EditorActions={EditorActions}
              animatedElements={animatedElements}
            />
            <TimelinePanel state={present} dispatch={dispatch} EditorActions={EditorActions} />
          </div>
          <aside className="w-80 border-l border-slate-800 bg-slate-900/60 backdrop-blur">
            <PropertiesInspector state={present} dispatch={dispatch} EditorActions={EditorActions} />
          </aside>
        </div>
      </div>
      {present.ui.showHelp && <HelpOverlay onClose={() => dispatch(EditorActions.toggleHelp(false))} />}
    </div>
  );
}
