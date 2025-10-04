import { useMemo, useState } from "react";
import { HexColorPicker } from "react-colorful";
import {
  AlignVerticalJustifyCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
  AlignCenterHorizontal,
  AlignCenterVertical,
  Copy,
  Trash2,
} from "lucide-react";

const FILL_MODES = [
  { value: "solid", label: "Solid" },
  { value: "linear", label: "Linear Gradient" },
  { value: "radial", label: "Radial Gradient" },
  { value: "pattern", label: "Pattern" },
];

const lineCaps = ["butt", "round", "square"];
const lineJoins = ["miter", "round", "bevel"];

export default function PropertiesInspector({ state, dispatch, EditorActions }) {
  const selectedElements = state.selection.map((id) => state.elements[id]).filter(Boolean);
  const element = selectedElements[0];
  const currentFillMode = useMemo(() => {
    if (!element) return "solid";
    if (element.gradient) return element.gradient.type === "radial" ? "radial" : "linear";
    if (element.pattern) return "pattern";
    return "solid";
  }, [element]);

  if (!element) {
    return (
      <div className="p-4 text-sm text-slate-400">
        Select an element to edit its properties. Use the toolbar to draw shapes, paths, and text.
      </div>
    );
  }

  const update = (updates) => dispatch(EditorActions.mergeElement(element.id, updates));

  const onAddKeyframe = (path) => {
    dispatch(
      EditorActions.addKeyframe(element.id, path, {
        time: state.timeline.time,
        value: getValueByPath(element, path),
        easing: "linear",
      })
    );
  };

  const onDuplicate = () => dispatch(EditorActions.duplicateSelection());
  const onDelete = () => dispatch(EditorActions.removeElement(element.id));

  return (
    <div className="p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-slate-200">{element.name}</div>
          <div className="text-xs text-slate-400">{element.type}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-btn" title="Duplicate" onClick={onDuplicate}>
            <Copy size={16} />
          </button>
          <button className="icon-btn" title="Delete" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <section>
        <h3 className="section-title">Transform</h3>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={element.transform.x} onChange={(v) => update({ transform: { ...element.transform, x: v } })} onAddKeyframe={() => onAddKeyframe("transform.x")} />
          <NumberField label="Y" value={element.transform.y} onChange={(v) => update({ transform: { ...element.transform, y: v } })} onAddKeyframe={() => onAddKeyframe("transform.y")} />
          <NumberField label="Rotate" value={element.transform.rotation} onChange={(v) => update({ transform: { ...element.transform, rotation: v } })} onAddKeyframe={() => onAddKeyframe("transform.rotation")} />
          <NumberField label="Scale X" value={element.transform.scaleX} onChange={(v) => update({ transform: { ...element.transform, scaleX: v } })} onAddKeyframe={() => onAddKeyframe("transform.scaleX")} />
          <NumberField label="Scale Y" value={element.transform.scaleY} onChange={(v) => update({ transform: { ...element.transform, scaleY: v } })} onAddKeyframe={() => onAddKeyframe("transform.scaleY")} />
          <NumberField label="Skew X" value={element.transform.skewX} onChange={(v) => update({ transform: { ...element.transform, skewX: v } })} />
          <NumberField label="Skew Y" value={element.transform.skewY} onChange={(v) => update({ transform: { ...element.transform, skewY: v } })} />
        </div>
      </section>

      <section>
        <h3 className="section-title">Style</h3>
        <NumberField label="Opacity" value={element.style.opacity} min={0} max={1} step={0.05} onChange={(v) => update({ style: { ...element.style, opacity: v } })} onAddKeyframe={() => onAddKeyframe("style.opacity")} />
        <NumberField label="Stroke Width" value={element.style.strokeWidth} min={0} step={0.5} onChange={(v) => update({ style: { ...element.style, strokeWidth: v } })} onAddKeyframe={() => onAddKeyframe("style.strokeWidth")} />
        <TextField label="Dash Array" value={element.style.strokeDasharray} onChange={(v) => update({ style: { ...element.style, strokeDasharray: v } })} />
        <NumberField label="Dash Offset" value={element.style.strokeDashoffset} onChange={(v) => update({ style: { ...element.style, strokeDashoffset: v } })} onAddKeyframe={() => onAddKeyframe("style.strokeDashoffset")} />
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Line Cap</label>
          <select
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={element.style.lineCap}
            onChange={(e) => update({ style: { ...element.style, lineCap: e.target.value } })}
          >
            {lineCaps.map((cap) => (
              <option key={cap} value={cap}>
                {cap}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Line Join</label>
          <select
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
            value={element.style.lineJoin}
            onChange={(e) => update({ style: { ...element.style, lineJoin: e.target.value } })}
          >
            {lineJoins.map((join) => (
              <option key={join} value={join}>
                {join}
              </option>
            ))}
          </select>
        </div>
        <ColorField label="Stroke" value={element.style.stroke} onChange={(v) => update({ style: { ...element.style, stroke: v } })} />
        <FillField
          mode={currentFillMode}
          onModeChange={(value) => {
            if (value === "solid") {
              update({ gradient: null, pattern: null, style: { ...element.style, fill: element.style.fill } });
            } else if (value === "linear") {
              update({ gradient: { type: "linear", angle: 45, stops: [ { offset: 0, color: element.style.fill }, { offset: 1, color: "#38bdf8" } ] }, pattern: null });
            } else if (value === "radial") {
              update({ gradient: { type: "radial", stops: [ { offset: 0, color: element.style.fill }, { offset: 1, color: "#0ea5e9" } ] }, pattern: null });
            } else if (value === "pattern") {
              update({ pattern: { type: "stripes", color: element.style.fill, background: "#0f172a", size: 8 }, gradient: null });
            }
          }}
          element={element}
          onChange={update}
        />
      </section>

      {element.type === "text" && (
        <section className="space-y-2">
          <h3 className="section-title">Typography</h3>
          <TextField label="Text" value={element.text} onChange={(value) => update({ text: value })} />
          <TextField label="Font Family" value={element.textOptions.fontFamily} onChange={(value) => update({ textOptions: { ...element.textOptions, fontFamily: value } })} />
          <NumberField label="Font Size" value={element.textOptions.fontSize} onChange={(value) => update({ textOptions: { ...element.textOptions, fontSize: value } })} />
          <TextField label="Font Weight" value={element.textOptions.fontWeight} onChange={(value) => update({ textOptions: { ...element.textOptions, fontWeight: value } })} />
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Alignment</label>
            <select
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
              value={element.textOptions.textAlign}
              onChange={(e) => update({ textOptions: { ...element.textOptions, textAlign: e.target.value } })}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </section>
      )}

      <section>
        <h3 className="section-title">Alignment</h3>
        <div className="grid grid-cols-3 gap-2">
          <button className="icon-btn" title="Align Left" onClick={() => dispatch(EditorActions.alignSelection("left"))}>
            <AlignLeft size={16} />
          </button>
          <button className="icon-btn" title="Align Horizontal Center" onClick={() => dispatch(EditorActions.alignSelection("center"))}>
            <AlignCenterHorizontal size={16} />
          </button>
          <button className="icon-btn" title="Align Right" onClick={() => dispatch(EditorActions.alignSelection("right"))}>
            <AlignRight size={16} />
          </button>
          <button className="icon-btn" title="Align Top" onClick={() => dispatch(EditorActions.alignSelection("top"))}>
            <AlignStartVertical size={16} />
          </button>
          <button className="icon-btn" title="Align Vertical Middle" onClick={() => dispatch(EditorActions.alignSelection("middle"))}>
            <AlignCenterVertical size={16} />
          </button>
          <button className="icon-btn" title="Align Bottom" onClick={() => dispatch(EditorActions.alignSelection("bottom"))}>
            <AlignEndVertical size={16} />
          </button>
          <button
            className="icon-btn"
            title="Distribute Horizontally"
            onClick={() => dispatch(EditorActions.distributeSelection("horizontal"))}
          >
            <AlignHorizontalJustifyCenter size={16} />
          </button>
          <button
            className="icon-btn"
            title="Distribute Vertically"
            onClick={() => dispatch(EditorActions.distributeSelection("vertical"))}
          >
            <AlignVerticalJustifyCenter size={16} />
          </button>
          <div />
        </div>
      </section>
    </div>
  );
}

const NumberField = ({ label, value, onChange, onAddKeyframe, min, max, step = 1 }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400 flex items-center justify-between">
      <span>{label}</span>
      {onAddKeyframe && (
        <button className="text-[10px] uppercase tracking-wide text-sky-300" onClick={onAddKeyframe} type="button">
          + keyframe
        </button>
      )}
    </span>
    <input
      type="number"
      value={typeof value === "number" ? value : Number(value) || 0}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
    />
  </label>
);

const TextField = ({ label, value, onChange }) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs text-slate-400">{label}</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
    />
  </label>
);

const ColorField = ({ label, value, onChange }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded px-2 py-1" onClick={() => setOpen(!open)}>
        <span className="w-4 h-4 rounded" style={{ background: value }} />
        <span className="text-xs text-slate-200">{value}</span>
      </button>
      {open && (
        <div className="mt-2 p-2 bg-slate-900 border border-slate-700 rounded">
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

const FillField = ({ mode, onModeChange, element, onChange }) => {
  return (
    <div className="space-y-2">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-slate-400">Fill</span>
        <select
          className="bg-slate-900 border border-slate-700 rounded px-2 py-1"
          value={mode}
          onChange={(e) => onModeChange(e.target.value)}
        >
          {FILL_MODES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {mode === "solid" && (
        <ColorField label="Color" value={element.style.fill} onChange={(value) => onChange({ style: { ...element.style, fill: value } })} />
      )}
      {mode === "linear" && element.gradient && (
        <div className="space-y-2">
          <NumberField
            label="Angle"
            value={element.gradient.angle || 0}
            onChange={(value) => onChange({ gradient: { ...element.gradient, angle: value } })}
          />
          {element.gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <NumberField
                label={`Stop ${index + 1}`}
                value={stop.offset}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => {
                  const stops = [...element.gradient.stops];
                  stops[index] = { ...stops[index], offset: value };
                  onChange({ gradient: { ...element.gradient, stops } });
                }}
              />
              <ColorField
                label=""
                value={stop.color}
                onChange={(color) => {
                  const stops = [...element.gradient.stops];
                  stops[index] = { ...stops[index], color };
                  onChange({ gradient: { ...element.gradient, stops } });
                }}
              />
            </div>
          ))}
        </div>
      )}
      {mode === "radial" && element.gradient && (
        <div className="space-y-2">
          {element.gradient.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <NumberField
                label={`Stop ${index + 1}`}
                value={stop.offset}
                min={0}
                max={1}
                step={0.05}
                onChange={(value) => {
                  const stops = [...element.gradient.stops];
                  stops[index] = { ...stops[index], offset: value };
                  onChange({ gradient: { ...element.gradient, stops } });
                }}
              />
              <ColorField
                label=""
                value={stop.color}
                onChange={(color) => {
                  const stops = [...element.gradient.stops];
                  stops[index] = { ...stops[index], color };
                  onChange({ gradient: { ...element.gradient, stops } });
                }}
              />
            </div>
          ))}
        </div>
      )}
      {mode === "pattern" && element.pattern && (
        <div className="space-y-2">
          <ColorField
            label="Foreground"
            value={element.pattern.color}
            onChange={(color) => onChange({ pattern: { ...element.pattern, color } })}
          />
          <ColorField
            label="Background"
            value={element.pattern.background}
            onChange={(color) => onChange({ pattern: { ...element.pattern, background: color } })}
          />
          <NumberField
            label="Size"
            value={element.pattern.size}
            min={2}
            max={64}
            onChange={(value) => onChange({ pattern: { ...element.pattern, size: value } })}
          />
        </div>
      )}
    </div>
  );
};

const getValueByPath = (element, path) => path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), element);
