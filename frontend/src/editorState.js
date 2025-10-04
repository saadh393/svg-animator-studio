import { nanoid } from "nanoid";

const defaultTimeline = {
  duration: 4000,
  fps: 24,
  loop: true,
};

const defaultExport = {
  frameRate: 24,
  resolution: { width: 800, height: 600 },
  looping: true,
};

const createLayer = (name = "Layer 1") => ({
  id: nanoid(6),
  name,
  visible: true,
  locked: false,
  items: [],
});

const defaultStyle = () => ({
  fill: "#ffffff",
  stroke: "#111827",
  strokeWidth: 2,
  strokeDasharray: "",
  strokeDashoffset: 0,
  opacity: 1,
  lineCap: "round",
  lineJoin: "round",
  fillOpacity: 1,
  strokeOpacity: 1,
});

const defaultTransform = () => ({
  x: 0,
  y: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
});

const baseDocument = () => ({
  width: 960,
  height: 540,
  background: "transparent",
  timeline: { ...defaultTimeline },
  export: { ...defaultExport },
});

const defaultState = () => ({
  document: baseDocument(),
  layers: [createLayer()],
  elements: {},
  selection: [],
  ui: {
    tool: "select",
    zoom: 1,
    pan: { x: 0, y: 0 },
    showGrid: true,
    snapToGrid: true,
    showHelp: false,
    playing: false,
    showOutline: false,
    timelineScale: 1,
    ghostPreview: false,
  },
  timeline: {
    time: 0,
  },
});

const createElement = (type, overrides = {}) => {
  const id = overrides.id || nanoid(8);
  const base = {
    id,
    name: overrides.name || `${type[0].toUpperCase()}${type.slice(1)} ${id.slice(-3)}`,
    type,
    layerId: overrides.layerId,
    transform: { ...defaultTransform(), ...(overrides.transform || {}) },
    style: { ...defaultStyle(), ...(overrides.style || {}) },
    keyframes: overrides.keyframes || {},
    gradient: overrides.gradient || null,
    pattern: overrides.pattern || null,
  };
  switch (type) {
    case "rect":
      return {
        ...base,
        geometry: {
          width: overrides.geometry?.width || 180,
          height: overrides.geometry?.height || 120,
          rx: overrides.geometry?.rx || 0,
          ry: overrides.geometry?.ry || 0,
        },
      };
    case "ellipse":
      return {
        ...base,
        geometry: {
          rx: overrides.geometry?.rx || 90,
          ry: overrides.geometry?.ry || 60,
        },
      };
    case "circle":
      return {
        ...base,
        geometry: {
          r: overrides.geometry?.r || 70,
        },
      };
    case "line":
      return {
        ...base,
        geometry: {
          x1: overrides.geometry?.x1 || -80,
          y1: overrides.geometry?.y1 || 0,
          x2: overrides.geometry?.x2 || 80,
          y2: overrides.geometry?.y2 || 0,
        },
      };
    case "polygon":
      return {
        ...base,
        geometry: {
          sides: overrides.geometry?.sides || 6,
          radius: overrides.geometry?.radius || 80,
        },
      };
    case "star":
      return {
        ...base,
        geometry: {
          points: overrides.geometry?.points || 5,
          innerRadius: overrides.geometry?.innerRadius || 40,
          outerRadius: overrides.geometry?.outerRadius || 90,
        },
      };
    case "path":
      return {
        ...base,
        geometry: {
          commands: overrides.geometry?.commands || [],
          closed: overrides.geometry?.closed ?? true,
        },
      };
    case "text":
      return {
        ...base,
        text: overrides.text || "New Text",
        textOptions: {
          fontFamily: overrides.textOptions?.fontFamily || "Inter",
          fontSize: overrides.textOptions?.fontSize || 32,
          fontWeight: overrides.textOptions?.fontWeight || "500",
          fontStyle: overrides.textOptions?.fontStyle || "normal",
          textAlign: overrides.textOptions?.textAlign || "center",
        },
      };
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
};

const clone = (obj) => (typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj)));

const withHistory = (state, nextPresent, meta = {}) => ({
  past: [...state.past, { present: state.present, meta }],
  present: nextPresent,
  future: [],
});

export const createInitialEditor = () => ({
  past: [],
  present: defaultState(),
  future: [],
});

const setSelection = (present, ids) => {
  present.selection = Array.isArray(ids) ? ids : ids ? [ids] : [];
};

const ensureLayer = (present) => {
  if (!present.layers.length) present.layers.push(createLayer());
  return present.layers[0].id;
};

const addToLayer = (present, layerId, elementId) => {
  const targetLayer = present.layers.find((l) => l.id === layerId) || present.layers[0];
  if (!targetLayer.items.includes(elementId)) targetLayer.items.push(elementId);
};

const removeFromLayers = (present, elementId) => {
  for (const layer of present.layers) {
    layer.items = layer.items.filter((id) => id !== elementId);
  }
};

const evaluateTrack = (track = [], baseValue, time) => {
  if (!track.length) return baseValue;
  const sorted = [...track].sort((a, b) => a.time - b.time);
  let prev = null;
  let next = null;
  for (const key of sorted) {
    if (key.time <= time) prev = key;
    if (key.time >= time) {
      next = key;
      break;
    }
  }
  if (!prev) return next?.value ?? baseValue;
  if (!next) return prev.value;
  if (prev.time === next.time) return next.value;
  const t = (time - prev.time) / (next.time - prev.time);
  const eased = applyEasing(prev.easing || "linear", t);
  return interpolateValue(prev.value, next.value, eased);
};

const applyEasing = (easing, t) => {
  const clamped = Math.max(0, Math.min(1, t));
  switch (easing) {
    case "ease-in":
      return clamped * clamped;
    case "ease-out":
      return clamped * (2 - clamped);
    case "ease-in-out":
      return clamped < 0.5 ? 2 * clamped * clamped : -1 + (4 - 2 * clamped) * clamped;
    default:
      return clamped;
  }
};

const interpolateValue = (a, b, t) => {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (typeof a === "string" && /^#/.test(a) && /^#/.test(b)) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    if (!ca || !cb) return t < 0.5 ? a : b;
    const mix = {
      r: Math.round(ca.r + (cb.r - ca.r) * t),
      g: Math.round(ca.g + (cb.g - ca.g) * t),
      b: Math.round(ca.b + (cb.b - ca.b) * t),
    };
    return rgbToHex(mix);
  }
  return t < 0.5 ? a : b;
};

const hexToRgb = (hex) => {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length === 3) {
    const [r, g, b] = cleaned.split("").map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    };
  }
  return null;
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;

export const evaluateElementAtTime = (element, time) => {
  const next = clone(element);
  const keys = Object.keys(element.keyframes || {});
  for (const key of keys) {
    const track = element.keyframes[key] || [];
    const base = getValueAtPath(element, key);
    const value = evaluateTrack(track, base, time);
    setValueAtPath(next, key, value);
  }
  return next;
};

const getValueAtPath = (obj, path) => path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
const setValueAtPath = (obj, path, value) => {
  const parts = path.split(".");
  const last = parts.pop();
  let target = obj;
  for (const part of parts) {
    if (!target[part]) target[part] = {};
    target = target[part];
  }
  target[last] = value;
};

const assignKeyframe = (element, path, keyframe) => {
  const track = element.keyframes[path] ? [...element.keyframes[path]] : [];
  const existingIdx = track.findIndex((k) => k.id === keyframe.id);
  if (existingIdx >= 0) track[existingIdx] = keyframe;
  else track.push(keyframe);
  element.keyframes[path] = track;
};

const removeKeyframe = (element, path, keyframeId) => {
  const track = element.keyframes[path] || [];
  element.keyframes[path] = track.filter((k) => k.id !== keyframeId);
};

export const editorReducer = (state, action) => {
  switch (action.type) {
    case "APPLY": {
      const draft = clone(state.present);
      action.mutate(draft);
      return withHistory(state, draft, action.meta || {});
    }
    case "SET_PRESENT":
      return { ...state, present: action.present };
    case "UNDO": {
      if (!state.past.length) return state;
      const previous = state.past[state.past.length - 1];
      const past = state.past.slice(0, -1);
      const future = [{ present: state.present, meta: action.meta || {} }, ...state.future];
      return { past, present: previous.present, future };
    }
    case "REDO": {
      if (!state.future.length) return state;
      const [next, ...rest] = state.future;
      return { past: [...state.past, { present: state.present, meta: action.meta || {} }], present: next.present, future: rest };
    }
    default:
      return state;
  }
};

export const EditorActions = {
  setTool: (tool) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.tool = tool;
    },
    meta: { type: "set-tool", tool },
  }),
  setZoom: (zoom) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.zoom = Math.min(8, Math.max(0.1, zoom));
    },
    meta: { type: "set-zoom", zoom },
  }),
  setPan: (pan) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.pan = pan;
    },
  }),
  toggleGrid: () => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.showGrid = !draft.ui.showGrid;
    },
  }),
  toggleSnap: () => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.snapToGrid = !draft.ui.snapToGrid;
    },
  }),
  toggleHelp: (show) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.showHelp = typeof show === "boolean" ? show : !draft.ui.showHelp;
    },
  }),
  setPlaying: (playing) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.ui.playing = playing;
    },
  }),
  setTime: (time) => ({
    type: "APPLY",
    mutate: (draft) => {
      const duration = draft.document.timeline.duration;
      draft.timeline.time = Math.max(0, Math.min(duration, time));
    },
  }),
  select: (ids) => ({
    type: "APPLY",
    mutate: (draft) => {
      setSelection(draft, ids);
    },
    meta: { type: "select", ids },
  }),
  clearSelection: () => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.selection = [];
    },
  }),
  addElement: (element) => ({
    type: "APPLY",
    mutate: (draft) => {
      const layerId = element.layerId || ensureLayer(draft);
      const created = createElement(element.type, { ...element, layerId });
      draft.elements[created.id] = created;
      addToLayer(draft, layerId, created.id);
      setSelection(draft, [created.id]);
    },
    meta: { type: "add-element", elementType: element.type },
  }),
  updateElement: (id, updates) => ({
    type: "APPLY",
    mutate: (draft) => {
      const el = draft.elements[id];
      if (!el) return;
      Object.assign(el, updates);
    },
    meta: { type: "update-element", id },
  }),
  mergeElement: (id, updates) => ({
    type: "APPLY",
    mutate: (draft) => {
      const el = draft.elements[id];
      if (!el) return;
      for (const key of Object.keys(updates)) {
        if (typeof updates[key] === "object" && !Array.isArray(updates[key])) {
          el[key] = { ...el[key], ...updates[key] };
        } else {
          el[key] = updates[key];
        }
      }
    },
    meta: { type: "merge-element", id },
  }),
  removeElement: (id) => ({
    type: "APPLY",
    mutate: (draft) => {
      delete draft.elements[id];
      removeFromLayers(draft, id);
      draft.selection = draft.selection.filter((sel) => sel !== id);
    },
    meta: { type: "remove-element", id },
  }),
  duplicateSelection: () => ({
    type: "APPLY",
    mutate: (draft) => {
      const ids = draft.selection;
      if (!ids.length) return;
      const newIds = [];
      for (const id of ids) {
        const el = draft.elements[id];
        if (!el) continue;
        const cloneEl = clone(el);
        cloneEl.id = nanoid(8);
        cloneEl.name = `${el.name} Copy`;
        cloneEl.transform = { ...el.transform, x: el.transform.x + 20, y: el.transform.y + 20 };
        draft.elements[cloneEl.id] = cloneEl;
        addToLayer(draft, cloneEl.layerId, cloneEl.id);
        newIds.push(cloneEl.id);
      }
      draft.selection = newIds;
    },
    meta: { type: "duplicate" },
  }),
  addLayer: (name) => ({
    type: "APPLY",
    mutate: (draft) => {
      const layer = createLayer(name || `Layer ${draft.layers.length + 1}`);
      draft.layers.unshift(layer);
    },
  }),
  deleteLayer: (layerId) => ({
    type: "APPLY",
    mutate: (draft) => {
      const idx = draft.layers.findIndex((l) => l.id === layerId);
      if (idx < 0 || draft.layers.length === 1) return;
      const [removed] = draft.layers.splice(idx, 1);
      for (const id of removed.items) {
        delete draft.elements[id];
        draft.selection = draft.selection.filter((sel) => sel !== id);
      }
    },
  }),
  renameLayer: (layerId, name) => ({
    type: "APPLY",
    mutate: (draft) => {
      const layer = draft.layers.find((l) => l.id === layerId);
      if (layer) layer.name = name;
    },
  }),
  reorderLayer: (layerId, direction) => ({
    type: "APPLY",
    mutate: (draft) => {
      const idx = draft.layers.findIndex((l) => l.id === layerId);
      if (idx < 0) return;
      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= draft.layers.length) return;
      const [layer] = draft.layers.splice(idx, 1);
      draft.layers.splice(nextIdx, 0, layer);
    },
  }),
  toggleLayerVisibility: (layerId) => ({
    type: "APPLY",
    mutate: (draft) => {
      const layer = draft.layers.find((l) => l.id === layerId);
      if (layer) layer.visible = !layer.visible;
    },
  }),
  toggleLayerLock: (layerId) => ({
    type: "APPLY",
    mutate: (draft) => {
      const layer = draft.layers.find((l) => l.id === layerId);
      if (layer) layer.locked = !layer.locked;
    },
  }),
  setDocument: (updates) => ({
    type: "APPLY",
    mutate: (draft) => {
      draft.document = { ...draft.document, ...updates };
      if (updates.timeline) {
        draft.document.timeline = { ...draft.document.timeline, ...updates.timeline };
      }
      if (updates.export) {
        draft.document.export = { ...draft.document.export, ...updates.export };
      }
    },
  }),
  addKeyframe: (elementId, path, keyframe) => ({
    type: "APPLY",
    mutate: (draft) => {
      const element = draft.elements[elementId];
      if (!element) return;
      assignKeyframe(element, path, { id: nanoid(6), ...keyframe });
    },
  }),
  updateKeyframe: (elementId, path, keyframeId, updates) => ({
    type: "APPLY",
    mutate: (draft) => {
      const element = draft.elements[elementId];
      if (!element) return;
      const track = element.keyframes[path] || [];
      const idx = track.findIndex((k) => k.id === keyframeId);
      if (idx < 0) return;
      track[idx] = { ...track[idx], ...updates };
      element.keyframes[path] = track;
    },
  }),
  removeKeyframe: (elementId, path, keyframeId) => ({
    type: "APPLY",
    mutate: (draft) => {
      const element = draft.elements[elementId];
      if (!element) return;
      removeKeyframe(element, path, keyframeId);
    },
  }),
  alignSelection: (mode) => ({
    type: "APPLY",
    mutate: (draft) => {
      const ids = draft.selection;
      if (ids.length < 2) return;
      const elements = ids.map((id) => draft.elements[id]).filter(Boolean);
      const bboxs = elements.map(getElementBoundingBox);
      const combined = combineBoundingBoxes(bboxs);
      elements.forEach((el, idx) => {
        const bbox = bboxs[idx];
        if (!bbox) return;
        const { transform } = el;
        switch (mode) {
          case "left":
            transform.x += combined.x - bbox.x;
            break;
          case "center":
            transform.x += combined.x + combined.width / 2 - (bbox.x + bbox.width / 2);
            break;
          case "right":
            transform.x += combined.x + combined.width - (bbox.x + bbox.width);
            break;
          case "top":
            transform.y += combined.y - bbox.y;
            break;
          case "middle":
            transform.y += combined.y + combined.height / 2 - (bbox.y + bbox.height / 2);
            break;
          case "bottom":
            transform.y += combined.y + combined.height - (bbox.y + bbox.height);
            break;
          default:
            break;
        }
      });
    },
  }),
  distributeSelection: (mode) => ({
    type: "APPLY",
    mutate: (draft) => {
      const ids = draft.selection;
      if (ids.length < 3) return;
      const elements = ids.map((id) => draft.elements[id]).filter(Boolean);
      const bboxs = elements.map(getElementBoundingBox).filter(Boolean);
      const sorted = elements
        .map((el, idx) => ({ el, bbox: bboxs[idx] }))
        .filter((entry) => entry.bbox)
        .sort((a, b) => (mode === "horizontal" ? a.bbox.x - b.bbox.x : a.bbox.y - b.bbox.y));
      if (sorted.length < 3) return;
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const space =
        mode === "horizontal"
          ? last.bbox.x - first.bbox.x - first.bbox.width
          : last.bbox.y - first.bbox.y - first.bbox.height;
      const totalSize = sorted.slice(1, -1).reduce((acc, { bbox }) => acc + (mode === "horizontal" ? bbox.width : bbox.height), 0);
      const gap = (space - totalSize) / (sorted.length - 1);
      let cursor =
        mode === "horizontal" ? first.bbox.x + first.bbox.width + gap : first.bbox.y + first.bbox.height + gap;
      sorted.slice(1, -1).forEach(({ el, bbox }) => {
        if (mode === "horizontal") {
          el.transform.x += cursor - bbox.x;
          cursor += bbox.width + gap;
        } else {
          el.transform.y += cursor - bbox.y;
          cursor += bbox.height + gap;
        }
      });
    },
  }),
};

const getElementBoundingBox = (element) => {
  if (!element) return null;
  const { transform } = element;
  switch (element.type) {
    case "rect": {
      const { width, height } = element.geometry;
      return {
        x: transform.x - width / 2,
        y: transform.y - height / 2,
        width,
        height,
      };
    }
    case "circle": {
      const { r } = element.geometry;
      return {
        x: transform.x - r,
        y: transform.y - r,
        width: r * 2,
        height: r * 2,
      };
    }
    case "ellipse": {
      const { rx, ry } = element.geometry;
      return {
        x: transform.x - rx,
        y: transform.y - ry,
        width: rx * 2,
        height: ry * 2,
      };
    }
    case "line": {
      const { x1, x2, y1, y2 } = element.geometry;
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const width = Math.abs(x2 - x1);
      const height = Math.abs(y2 - y1);
      return { x: transform.x + minX, y: transform.y + minY, width, height };
    }
    case "polygon":
      return polygonBounds(element.geometry.sides, element.geometry.radius, transform);
    case "star":
      return starBounds(element.geometry.points, element.geometry.innerRadius, element.geometry.outerRadius, transform);
    case "path": {
      const pts = element.geometry.commands || [];
      if (!pts.length) return { x: transform.x, y: transform.y, width: 0, height: 0 };
      const xs = pts.map((p) => p.x + transform.x);
      const ys = pts.map((p) => p.y + transform.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case "text": {
      const size = element.textOptions?.fontSize || 24;
      const width = size * (element.text?.length || 1) * 0.6;
      const height = size * 1.2;
      return {
        x: transform.x - width / 2,
        y: transform.y - height / 2,
        width,
        height,
      };
    }
    default:
      return null;
  }
};

const polygonBounds = (sides, radius, transform) => {
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2;
    points.push({ x: Math.cos(angle) * radius + transform.x, y: Math.sin(angle) * radius + transform.y });
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const starBounds = (points, inner, outer, transform) => {
  const coords = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = ((Math.PI) / points) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    coords.push({ x: Math.cos(angle) * radius + transform.x, y: Math.sin(angle) * radius + transform.y });
  }
  const xs = coords.map((p) => p.x);
  const ys = coords.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const combineBoundingBoxes = (boxes) => {
  const valid = boxes.filter(Boolean);
  if (!valid.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...valid.map((b) => b.x));
  const maxX = Math.max(...valid.map((b) => b.x + b.width));
  const minY = Math.min(...valid.map((b) => b.y));
  const maxY = Math.max(...valid.map((b) => b.y + b.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export {
  defaultState,
  createElement,
  defaultStyle,
  defaultTransform,
  evaluateTrack,
  setSelection,
  ensureLayer,
  addToLayer,
  removeFromLayers,
  assignKeyframe,
  removeKeyframe,
  getElementBoundingBox,
  combineBoundingBoxes,
  polygonBounds,
  starBounds,
};
