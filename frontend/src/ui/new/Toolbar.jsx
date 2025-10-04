import { useEffect } from "react";
import {
  MousePointer2,
  Hand,
  PenTool,
  Square,
  Circle,
  CircleDashed,
  Minus,
  Pentagon,
  Star,
  Type,
  Scissors,
} from "lucide-react";

const TOOL_ITEMS = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pan", icon: Hand, label: "Pan (H)" },
  { id: "pen", icon: PenTool, label: "Freehand Pen (P)" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "ellipse", icon: CircleDashed, label: "Ellipse" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "polygon", icon: Pentagon, label: "Polygon" },
  { id: "star", icon: Star, label: "Star" },
  { id: "text", icon: Type, label: "Text" },
];

export default function Toolbar({ state, dispatch, EditorActions }) {
  useEffect(() => {
    const handle = (event) => {
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") return;
      switch (event.key.toLowerCase()) {
        case "v":
          dispatch(EditorActions.setTool("select"));
          break;
        case "h":
          dispatch(EditorActions.setTool("pan"));
          break;
        case "p":
          dispatch(EditorActions.setTool("pen"));
          break;
        case "t":
          dispatch(EditorActions.setTool("text"));
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [dispatch, EditorActions]);

  const tool = state.ui.tool;

  return (
    <aside className="w-14 border-r border-slate-800 bg-slate-900/60 flex flex-col items-center py-3 gap-2">
      {TOOL_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => dispatch(EditorActions.setTool(item.id))}
            className={`icon-btn w-10 h-10 ${tool === item.id ? "bg-sky-500/20 text-sky-300" : ""}`}
            title={item.label}
          >
            <Icon size={18} />
          </button>
        );
      })}
      <div className="mt-6 space-y-2">
        <button
          className="icon-btn w-10 h-10"
          title="Union"
          onClick={() => dispatch({ type: "APPLY", mutate: unionSelection })}
        >
          <Scissors size={18} className="rotate-45" />
        </button>
        <button
          className="icon-btn w-10 h-10"
          title="Subtract"
          onClick={() => dispatch({ type: "APPLY", mutate: subtractSelection })}
        >
          <Scissors size={18} />
        </button>
      </div>
    </aside>
  );
}

const unionSelection = (draft) => {
  if (draft.selection.length < 2) return;
  const baseId = draft.selection[0];
  const base = draft.elements[baseId];
  if (!base || base.type !== "rect") return; // simplified fallback
  const rest = draft.selection.slice(1).map((id) => draft.elements[id]).filter(Boolean);
  let maxRight = base.transform.x + base.geometry.width / 2;
  let minLeft = base.transform.x - base.geometry.width / 2;
  let maxTop = base.transform.y - base.geometry.height / 2;
  let maxBottom = base.transform.y + base.geometry.height / 2;
  rest.forEach((el) => {
    if (el.type !== "rect") return;
    maxRight = Math.max(maxRight, el.transform.x + el.geometry.width / 2);
    minLeft = Math.min(minLeft, el.transform.x - el.geometry.width / 2);
    maxTop = Math.min(maxTop, el.transform.y - el.geometry.height / 2);
    maxBottom = Math.max(maxBottom, el.transform.y + el.geometry.height / 2);
    delete draft.elements[el.id];
    draft.layers.forEach((layer) => {
      layer.items = layer.items.filter((itemId) => itemId !== el.id);
    });
  });
  base.geometry.width = maxRight - minLeft;
  base.geometry.height = maxBottom - maxTop;
  base.transform.x = (maxRight + minLeft) / 2;
  base.transform.y = (maxTop + maxBottom) / 2;
  draft.selection = [baseId];
};

const subtractSelection = (draft) => {
  if (draft.selection.length < 2) return;
  const [targetId, subtractId] = draft.selection;
  const target = draft.elements[targetId];
  const subtract = draft.elements[subtractId];
  if (!target || !subtract || target.type !== "rect" || subtract.type !== "rect") return;
  target.geometry.width = Math.max(10, target.geometry.width - subtract.geometry.width);
  target.geometry.height = Math.max(10, target.geometry.height - subtract.geometry.height);
  draft.layers.forEach((layer) => {
    layer.items = layer.items.filter((itemId) => itemId !== subtractId);
  });
  delete draft.elements[subtractId];
  draft.selection = [targetId];
};
