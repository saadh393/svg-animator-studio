import { useEffect, useRef } from "react";
import { Play, Pause, Undo2, Redo2, ZoomIn, ZoomOut, HelpCircle, Upload, FileDown, Grid3X3 } from "lucide-react";
import { createElement } from "../../editorState";

const formatTime = (ms) => {
  const seconds = ms / 1000;
  return seconds.toFixed(2) + "s";
};

export default function TopBar({ state, dispatch, EditorActions }) {
  const rafRef = useRef(null);

  useEffect(() => {
    if (!state.ui.playing) return;
    const start = performance.now() - state.timeline.time;
    const tick = () => {
      const now = performance.now() - start;
      const duration = state.document.timeline.duration;
      let time = now;
      if (now > duration) {
        if (state.document.timeline.loop) {
          time = now % duration;
        } else {
          time = duration;
          dispatch(EditorActions.setPlaying(false));
          dispatch(EditorActions.setTime(duration));
          return;
        }
      }
      dispatch(EditorActions.setTime(time));
      if (state.ui.playing) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state.ui.playing, state.document.timeline.duration, state.document.timeline.loop, state.timeline.time, dispatch]);

  const onImportSvg = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    event.target.value = "";
    dispatch({
      type: "APPLY",
      mutate: (draft) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "image/svg+xml");
        const svg = doc.documentElement;
        const width = parseFloat(svg.getAttribute("width")) || state.document.width;
        const height = parseFloat(svg.getAttribute("height")) || state.document.height;
        draft.document.width = width;
        draft.document.height = height;
        const layerId = draft.layers[0].id;
        draft.layers[0].items = [];
        draft.elements = {};
        Array.from(svg.children).forEach((child) => {
          if (!(child instanceof SVGElement)) return;
          const tag = child.tagName.toLowerCase();
          const transform = child.getAttribute("transform") || "";
          const baseTransform = parseTransform(transform);
          if (tag === "rect") {
            const element = createElement("rect", {
              id: child.id || undefined,
              layerId,
              transform: baseTransform,
              geometry: {
                width: parseFloat(child.getAttribute("width")) || 100,
                height: parseFloat(child.getAttribute("height")) || 100,
                rx: parseFloat(child.getAttribute("rx")) || 0,
                ry: parseFloat(child.getAttribute("ry")) || 0,
              },
              style: {
                fill: child.getAttribute("fill") || "#ffffff",
                stroke: child.getAttribute("stroke") || "#111827",
                strokeWidth: parseFloat(child.getAttribute("stroke-width")) || 1,
                strokeDasharray: child.getAttribute("stroke-dasharray") || "",
                strokeDashoffset: parseFloat(child.getAttribute("stroke-dashoffset")) || 0,
                opacity: parseFloat(child.getAttribute("opacity")) || 1,
                lineCap: child.getAttribute("stroke-linecap") || "round",
                lineJoin: child.getAttribute("stroke-linejoin") || "round",
              },
            });
            draft.elements[element.id] = element;
            draft.layers[0].items.push(element.id);
          }
        });
      },
    });
  };

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div className="flex items-center gap-2">
        <button
          className="btn"
          onClick={() => dispatch(EditorActions.setPlaying(!state.ui.playing))}
        >
          {state.ui.playing ? <Pause size={16} /> : <Play size={16} />}<span className="ml-2">{state.ui.playing ? "Pause" : "Play"}</span>
        </button>
        <div className="text-xs text-slate-300">
          {formatTime(state.timeline.time)} / {formatTime(state.document.timeline.duration)} @ {state.document.timeline.fps} fps
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="icon-btn" onClick={() => dispatch({ type: "UNDO" })} title="Undo (Ctrl+Z)">
          <Undo2 size={16} />
        </button>
        <button className="icon-btn" onClick={() => dispatch({ type: "REDO" })} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={16} />
        </button>
        <button className="icon-btn" onClick={() => dispatch(EditorActions.setZoom(state.ui.zoom * 1.1))} title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button className="icon-btn" onClick={() => dispatch(EditorActions.setZoom(state.ui.zoom / 1.1))} title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button className="icon-btn" onClick={() => dispatch(EditorActions.toggleGrid())} title="Toggle Grid">
          <Grid3X3 size={16} />
        </button>
        <label className="icon-btn cursor-pointer" title="Import SVG">
          <Upload size={16} />
          <input type="file" accept="image/svg+xml" className="hidden" onChange={onImportSvg} />
        </label>
        <button
          className="icon-btn"
          title="Export SVG"
          onClick={() => exportCurrentSvg(state)}
        >
          <FileDown size={16} />
        </button>
        <button className="icon-btn" onClick={() => dispatch(EditorActions.toggleHelp(true))} title="Help">
          <HelpCircle size={16} />
        </button>
      </div>
    </header>
  );
}

const exportCurrentSvg = (state) => {
  const svg = buildSvgString(state);
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "animation.svg";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const buildSvgString = (state) => {
  const { width, height } = state.document;
  const svg = [`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`];
  const defs = [];
  const orderedElements = [];
  for (const layer of [...state.layers].reverse()) {
    if (!layer.visible) continue;
    for (const id of layer.items) {
      const element = state.elements[id];
      if (element) orderedElements.push(element);
    }
  }
  orderedElements.forEach((el) => {
    if (el.gradient) {
      const gradId = `grad_${el.id}`;
      if (el.gradient.type === "linear") {
        const angle = el.gradient.angle || 0;
        const rad = (angle * Math.PI) / 180;
        const x1 = 0.5 + Math.cos(rad + Math.PI) * 0.5;
        const y1 = 0.5 + Math.sin(rad + Math.PI) * 0.5;
        const x2 = 0.5 + Math.cos(rad) * 0.5;
        const y2 = 0.5 + Math.sin(rad) * 0.5;
        defs.push(
          `<linearGradient id="${gradId}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="objectBoundingBox">${(el.gradient.stops || [])
            .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}" />`)
            .join("")}</linearGradient>`
        );
      } else if (el.gradient.type === "radial") {
        defs.push(
          `<radialGradient id="${gradId}" cx="50%" cy="50%" r="75%">${(el.gradient.stops || [])
            .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}" />`)
            .join("")}</radialGradient>`
        );
      }
    }
    if (el.pattern) {
      const patternId = `pat_${el.id}`;
      const size = el.pattern.size || 8;
      defs.push(
        `<pattern id="${patternId}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${size}" height="${size}" fill="${el.pattern.background}" /><rect width="${size}" height="${size / 2}" fill="${el.pattern.color}" /></pattern>`
      );
    }
  });
  if (defs.length) {
    svg.push(`<defs>${defs.join("")}</defs>`);
  }
  orderedElements.forEach((element) => {
    const node = renderElement(element);
    if (node) svg.push(node);
  });
  svg.push("</svg>");
  return svg.join("\n");
};

const renderElement = (element) => {
  const { transform, style } = element;
  const transformAttr = `translate(${transform.x},${transform.y}) rotate(${transform.rotation}) scale(${transform.scaleX},${transform.scaleY}) skewX(${transform.skewX}) skewY(${transform.skewY})`;
  const baseAttrs = `transform="${transformAttr}" opacity="${style.opacity}" stroke="${style.stroke}" fill="${style.fill}" stroke-width="${style.strokeWidth}" stroke-dasharray="${style.strokeDasharray}" stroke-dashoffset="${style.strokeDashoffset}" stroke-linecap="${style.lineCap}" stroke-linejoin="${style.lineJoin}"`;
  switch (element.type) {
    case "rect": {
      const { width, height, rx = 0, ry = 0 } = element.geometry;
      return `<rect ${baseAttrs} width="${width}" height="${height}" x="${-width / 2}" y="${-height / 2}" rx="${rx}" ry="${ry}" />`;
    }
    case "circle": {
      const { r } = element.geometry;
      return `<circle ${baseAttrs} r="${r}" />`;
    }
    case "ellipse": {
      const { rx, ry } = element.geometry;
      return `<ellipse ${baseAttrs} rx="${rx}" ry="${ry}" />`;
    }
    case "line": {
      const { x1, y1, x2, y2 } = element.geometry;
      return `<line ${baseAttrs} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    }
    case "polygon": {
      const { sides, radius } = element.geometry;
      const points = new Array(sides)
        .fill(0)
        .map((_, i) => {
          const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2;
          return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
        })
        .join(" ");
      return `<polygon ${baseAttrs} points="${points}" />`;
    }
    case "star": {
      const { points, innerRadius, outerRadius } = element.geometry;
      const coords = new Array(points * 2)
        .fill(0)
        .map((_, i) => {
          const angle = ((Math.PI) / points) * i - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
        })
        .join(" ");
      return `<polygon ${baseAttrs} points="${coords}" />`;
    }
    case "path": {
      const d = element.geometry.commands
        .map((cmd, idx) => `${idx === 0 ? "M" : "L"}${cmd.x},${cmd.y}`)
        .join(" ") + (element.geometry.closed ? " Z" : "");
      return `<path ${baseAttrs} d="${d}" fill-rule="evenodd" />`;
    }
    case "text": {
      const { fontFamily, fontSize, fontWeight, fontStyle, textAlign } = element.textOptions;
      return `<text ${baseAttrs} font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start"}">${element.text}</text>`;
    }
    default:
      return null;
  }
};

const parseTransform = (transform) => {
  const base = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
  if (!transform) return base;
  const translateMatch = transform.match(/translate\(([^\)]+)\)/);
  if (translateMatch) {
    const [x, y = 0] = translateMatch[1].split(/[ ,]/).map((v) => parseFloat(v));
    base.x = x;
    base.y = y;
  }
  const rotateMatch = transform.match(/rotate\(([^\)]+)\)/);
  if (rotateMatch) {
    base.rotation = parseFloat(rotateMatch[1]);
  }
  const scaleMatch = transform.match(/scale\(([^\)]+)\)/);
  if (scaleMatch) {
    const values = scaleMatch[1].split(/[ ,]/).map((v) => parseFloat(v));
    base.scaleX = values[0];
    base.scaleY = values[1] ?? values[0];
  }
  const skewXMatch = transform.match(/skewX\(([^\)]+)\)/);
  if (skewXMatch) base.skewX = parseFloat(skewXMatch[1]);
  const skewYMatch = transform.match(/skewY\(([^\)]+)\)/);
  if (skewYMatch) base.skewY = parseFloat(skewYMatch[1]);
  return base;
};
