import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const snapValue = (value, snap, enabled) => (enabled ? Math.round(value / snap) * snap : value);

export default function CanvasStage({ state, dispatch, EditorActions: Actions, animatedElements }) {
  const svgRef = useRef(null);
  const overlayRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const stateRef = useRef(state);
  const zoom = state.ui.zoom;
  const pan = state.ui.pan;
  const snapEnabled = state.ui.snapToGrid;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const elements = state.ui.playing ? animatedElements : state.elements;

  const definitions = useMemo(() => {
    const defs = [];
    Object.values(state.elements).forEach((el) => {
      if (el.gradient) {
        const id = `grad_${el.id}`;
        if (el.gradient.type === "linear") {
          defs.push({
            type: "linearGradient",
            id,
            angle: el.gradient.angle || 0,
            stops: el.gradient.stops || [],
          });
        } else if (el.gradient.type === "radial") {
          defs.push({ type: "radialGradient", id, stops: el.gradient.stops || [] });
        }
      }
      if (el.pattern) {
        defs.push({ type: "pattern", id: `pat_${el.id}`, pattern: el.pattern });
      }
    });
    return defs;
  }, [state.elements]);

  const sortedIds = useMemo(() => {
    const list = [];
    state.layers.forEach((layer) => {
      if (!layer.visible) return;
      layer.items.forEach((id) => list.push(id));
    });
    return list;
  }, [state.layers]);

  const viewBoxWidth = state.document.width / zoom;
  const viewBoxHeight = state.document.height / zoom;

  const getPoint = useCallback((event) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const inv = svg.getScreenCTM()?.inverse();
    if (!inv) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(inv);
    return {
      x: snapValue(transformed.x, 8, snapEnabled),
      y: snapValue(transformed.y, 8, snapEnabled),
    };
  }, [snapEnabled]);

  const activeLayerId = useMemo(() => {
    const unlocked = state.layers.find((layer) => !layer.locked);
    return (unlocked || state.layers[0] || { id: null }).id;
  }, [state.layers]);

  const finalizeDraw = (tool, start, end, layerId) => {
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);
    const center = { x: (end.x + start.x) / 2, y: (end.y + start.y) / 2 };
    if (tool === "rect") {
      dispatch(
        Actions.addElement({
          type: "rect",
          transform: { x: center.x, y: center.y },
          geometry: { width: Math.max(width, 10), height: Math.max(height, 10), rx: 0, ry: 0 },
          layerId,
        })
      );
    } else if (tool === "circle") {
      const radius = Math.max(width, height) / 2;
      dispatch(
        Actions.addElement({
          type: "circle",
          transform: { x: center.x, y: center.y },
          geometry: { r: Math.max(radius, 8) },
          layerId,
        })
      );
    } else if (tool === "ellipse") {
      dispatch(
        Actions.addElement({
          type: "ellipse",
          transform: { x: center.x, y: center.y },
          geometry: { rx: Math.max(width / 2, 8), ry: Math.max(height / 2, 8) },
          layerId,
        })
      );
    } else if (tool === "line") {
      dispatch(
        Actions.addElement({
          type: "line",
          transform: { x: start.x, y: start.y },
          geometry: { x1: 0, y1: 0, x2: end.x - start.x, y2: end.y - start.y },
          layerId,
        })
      );
    } else if (tool === "polygon") {
      const radius = Math.max(width, height) / 2;
      dispatch(
        Actions.addElement({
          type: "polygon",
          transform: { x: center.x, y: center.y },
          geometry: { radius: Math.max(radius, 12), sides: 5 },
          layerId,
        })
      );
    } else if (tool === "star") {
      const radius = Math.max(width, height) / 2;
      dispatch(
        Actions.addElement({
          type: "star",
          transform: { x: center.x, y: center.y },
          geometry: { outerRadius: Math.max(radius, 16), innerRadius: Math.max(radius / 2, 8), points: 5 },
          layerId,
        })
      );
    }
  };

  const finalizePen = (path, layerId) => {
    if (!path.length) return;
    dispatch(
      Actions.addElement({
        type: "path",
        transform: { x: 0, y: 0 },
        geometry: { commands: path, closed: true },
        layerId,
      })
    );
  };

  useEffect(() => {
    if (!dragging) return;
    const overlay = overlayRef.current;

    const handleMove = (event) => {
      const currentState = stateRef.current;
      if (!currentState) return;
      if (dragging.mode === "move" && dragging.id) {
        const element = currentState.elements[dragging.id];
        if (!element) return;
        const { x, y } = getPoint(event);
        const dx = x - dragging.start.x;
        const dy = y - dragging.start.y;
        dispatch(
          Actions.mergeElement(dragging.id, {
            transform: {
              ...dragging.initial,
              x: dragging.initial.x + dx,
              y: dragging.initial.y + dy,
            },
          })
        );
      } else if (dragging.mode === "pan") {
        const { startClient, initialPan } = dragging;
        const dx = (event.clientX - startClient.x) * (viewBoxWidth / currentState.document.width);
        const dy = (event.clientY - startClient.y) * (viewBoxHeight / currentState.document.height);
        dispatch(Actions.setPan({ x: initialPan.x - dx, y: initialPan.y - dy }));
      } else if (dragging.mode === "draw") {
        const { x, y } = getPoint(event);
        drawShapePreview(dragging, { x, y }, overlay);
      } else if (dragging.mode === "pen") {
        const { x, y } = getPoint(event);
        const next = [...dragging.path, { x, y }];
        drawPenPreview(next, overlay);
        setDragging((prev) => (prev && prev.mode === "pen" ? { ...prev, path: next } : prev));
      }
    };

    const handleUp = (event) => {
      const currentState = stateRef.current;
      if (overlay) overlay.innerHTML = "";
      if (dragging.mode === "draw") {
        const { x, y } = getPoint(event);
        finalizeDraw(dragging.tool, dragging.start, { x, y }, dragging.layerId || activeLayerId);
      } else if (dragging.mode === "pen") {
        finalizePen(dragging.path, dragging.layerId || activeLayerId);
      }
      setDragging(null);
      if (currentState?.ui.tool === "select" && dragging.mode === "move") {
        // Nothing extra
      }
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    window.addEventListener("blur", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
      window.removeEventListener("blur", handleUp);
    };
  }, [dragging, dispatch, Actions, activeLayerId, getPoint, viewBoxWidth, viewBoxHeight]);

  const onPointerDown = (event) => {
    event.preventDefault();
    const { x, y } = getPoint(event);
    const tool = state.ui.tool;
    if (tool === "select") {
      const target = event.target.closest("[data-element]");
      if (target) {
        const id = target.dataset.element;
        dispatch(Actions.select([id]));
        const element = state.elements[id];
        if (!element) return;
        setDragging({ mode: "move", id, start: { x, y }, initial: { ...element.transform } });
      } else {
        dispatch(Actions.clearSelection());
      }
    } else if (tool === "pan") {
      setDragging({ mode: "pan", startClient: { x: event.clientX, y: event.clientY }, initialPan: { ...pan } });
    } else if (["rect", "circle", "ellipse", "line", "polygon", "star"].includes(tool)) {
      const layerId = activeLayerId;
      if (!layerId) return;
      setDragging({ mode: "draw", tool, start: { x, y }, layerId });
      drawShapePreview({ mode: "draw", tool, start: { x, y } }, { x, y }, overlayRef.current);
    } else if (tool === "pen") {
      const layerId = activeLayerId;
      if (!layerId) return;
      const cmd = { x, y };
      drawPenPreview([cmd], overlayRef.current);
      setDragging({ mode: "pen", path: [cmd], layerId });
    } else if (tool === "text") {
      const layerId = activeLayerId;
      if (!layerId) return;
      dispatch(
        Actions.addElement({
          type: "text",
          transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
          layerId,
          text: "Sample Text",
        })
      );
    }
  };

  const onWheel = (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    const nextZoom = delta < 0 ? zoom * 1.1 : zoom / 1.1;
    dispatch(Actions.setZoom(nextZoom));
  };

  return (
    <div className="flex-1 relative bg-slate-900" onWheel={onWheel}>
      <div className="absolute inset-4 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full touch-none"
          viewBox={`${pan.x} ${pan.y} ${viewBoxWidth} ${viewBoxHeight}`}
          onPointerDown={onPointerDown}
        >
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="0.5" />
            </pattern>
            {definitions.map((def) => {
              if (def.type === "linearGradient") {
                const { id, angle, stops } = def;
                const rad = (angle * Math.PI) / 180;
                const x1 = 0.5 + Math.cos(rad + Math.PI) * 0.5;
                const y1 = 0.5 + Math.sin(rad + Math.PI) * 0.5;
                const x2 = 0.5 + Math.cos(rad) * 0.5;
                const y2 = 0.5 + Math.sin(rad) * 0.5;
                return (
                  <linearGradient key={id} id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="objectBoundingBox">
                    {stops.map((stop, idx) => (
                      <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </linearGradient>
                );
              }
              if (def.type === "radialGradient") {
                return (
                  <radialGradient key={def.id} id={def.id} cx="50%" cy="50%" r="75%">
                    {def.stops.map((stop, idx) => (
                      <stop key={idx} offset={stop.offset} stopColor={stop.color} />
                    ))}
                  </radialGradient>
                );
              }
              if (def.type === "pattern") {
                const { id, pattern } = def;
                const size = pattern.size || 8;
                return (
                  <pattern key={id} id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width={size} height={size} fill={pattern.background} />
                    <rect width={size} height={size / 2} fill={pattern.color} />
                  </pattern>
                );
              }
              return null;
            })}
          </defs>
          {state.ui.showGrid && <rect x={pan.x} y={pan.y} width={viewBoxWidth} height={viewBoxHeight} fill="url(#grid)" />}
          {sortedIds.map((id) => {
            const element = elements[id];
            if (!element) return null;
            return renderElement(element, state.selection.includes(id));
          })}
        </svg>
        <svg ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`${pan.x} ${pan.y} ${viewBoxWidth} ${viewBoxHeight}`} />
      </div>
    </div>
  );
}

const renderElement = (element, selected) => {
  const { transform, style } = element;
  const fillValue = element.gradient ? `url(#grad_${element.id})` : element.pattern ? `url(#pat_${element.id})` : style.fill;
  const transformAttr = `translate(${transform.x},${transform.y}) rotate(${transform.rotation}) scale(${transform.scaleX},${transform.scaleY}) skewX(${transform.skewX}) skewY(${transform.skewY})`;
  const base = {
    transform: transformAttr,
    opacity: style.opacity,
    stroke: style.stroke,
    fill: fillValue,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.strokeDasharray,
    strokeDashoffset: style.strokeDashoffset,
    strokeLinecap: style.lineCap,
    strokeLinejoin: style.lineJoin,
    "data-element": element.id,
    className: selected ? "drop-shadow-lg" : undefined,
  };
  switch (element.type) {
    case "rect": {
      const { width, height, rx = 0, ry = 0 } = element.geometry;
      return <rect key={element.id} {...base} x={-width / 2} y={-height / 2} width={width} height={height} rx={rx} ry={ry} />;
    }
    case "circle": {
      const { r } = element.geometry;
      return <circle key={element.id} {...base} r={r} />;
    }
    case "ellipse": {
      const { rx, ry } = element.geometry;
      return <ellipse key={element.id} {...base} rx={rx} ry={ry} />;
    }
    case "line": {
      const { x1, y1, x2, y2 } = element.geometry;
      return <line key={element.id} {...base} x1={x1} y1={y1} x2={x2} y2={y2} />;
    }
    case "polygon": {
      const { sides, radius } = element.geometry;
      const points = new Array(sides).fill(0).map((_, i) => {
        const angle = ((Math.PI * 2) / sides) * i - Math.PI / 2;
        return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
      });
      return <polygon key={element.id} {...base} points={points.join(" ")} />;
    }
    case "star": {
      const { points, innerRadius, outerRadius } = element.geometry;
      const coords = new Array(points * 2).fill(0).map((_, i) => {
        const angle = ((Math.PI) / points) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        return `${Math.cos(angle) * radius},${Math.sin(angle) * radius}`;
      });
      return <polygon key={element.id} {...base} points={coords.join(" ")} />;
    }
    case "path": {
      const d = element.geometry.commands.map((cmd, idx) => `${idx === 0 ? "M" : "L"}${cmd.x},${cmd.y}`).join(" ") + (element.geometry.closed ? " Z" : "");
      return <path key={element.id} {...base} d={d} fillRule="evenodd" />;
    }
    case "text": {
      const { fontFamily, fontSize, fontWeight, fontStyle, textAlign } = element.textOptions;
      return (
        <text
          key={element.id}
          {...base}
          fontFamily={fontFamily}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontStyle={fontStyle}
          textAnchor={textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start"}
        >
          {element.text}
        </text>
      );
    }
    default:
      return null;
  }
};

const drawShapePreview = (dragging, current, overlay) => {
  if (!overlay) return;
  const { start, tool } = dragging;
  overlay.innerHTML = "";
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);
  const center = { x: (current.x + start.x) / 2, y: (current.y + start.y) / 2 };
  const ns = "http://www.w3.org/2000/svg";
  if (tool === "rect") {
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", String(center.x - width / 2));
    rect.setAttribute("y", String(center.y - height / 2));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", "rgba(56, 189, 248, 0.15)");
    rect.setAttribute("stroke", "rgba(56, 189, 248, 0.6)");
    rect.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(rect);
  } else if (tool === "circle") {
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", String(center.x));
    circle.setAttribute("cy", String(center.y));
    circle.setAttribute("r", String(Math.max(width, height) / 2));
    circle.setAttribute("fill", "rgba(56, 189, 248, 0.15)");
    circle.setAttribute("stroke", "rgba(56, 189, 248, 0.6)");
    circle.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(circle);
  } else if (tool === "ellipse") {
    const ellipse = document.createElementNS(ns, "ellipse");
    ellipse.setAttribute("cx", String(center.x));
    ellipse.setAttribute("cy", String(center.y));
    ellipse.setAttribute("rx", String(width / 2));
    ellipse.setAttribute("ry", String(height / 2));
    ellipse.setAttribute("fill", "rgba(56, 189, 248, 0.15)");
    ellipse.setAttribute("stroke", "rgba(56, 189, 248, 0.6)");
    ellipse.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(ellipse);
  } else if (tool === "line") {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(start.x));
    line.setAttribute("y1", String(start.y));
    line.setAttribute("x2", String(current.x));
    line.setAttribute("y2", String(current.y));
    line.setAttribute("stroke", "rgba(56, 189, 248, 0.8)");
    line.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(line);
  } else if (tool === "polygon") {
    const polygon = document.createElementNS(ns, "polygon");
    const radius = Math.max(width, height) / 2;
    const points = new Array(5).fill(0).map((_, i) => {
      const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
      return `${center.x + Math.cos(angle) * radius},${center.y + Math.sin(angle) * radius}`;
    });
    polygon.setAttribute("points", points.join(" "));
    polygon.setAttribute("fill", "rgba(56, 189, 248, 0.15)");
    polygon.setAttribute("stroke", "rgba(56, 189, 248, 0.6)");
    polygon.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(polygon);
  } else if (tool === "star") {
    const polygon = document.createElementNS(ns, "polygon");
    const radius = Math.max(width, height) / 2;
    const coords = new Array(10).fill(0).map((_, i) => {
      const angle = ((Math.PI) / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? radius : radius / 2;
      return `${center.x + Math.cos(angle) * r},${center.y + Math.sin(angle) * r}`;
    });
    polygon.setAttribute("points", coords.join(" "));
    polygon.setAttribute("fill", "rgba(56, 189, 248, 0.15)");
    polygon.setAttribute("stroke", "rgba(56, 189, 248, 0.6)");
    polygon.setAttribute("stroke-dasharray", "6 6");
    overlay.appendChild(polygon);
  }
};

const drawPenPreview = (points, overlay) => {
  if (!overlay) return;
  overlay.innerHTML = "";
  const ns = "http://www.w3.org/2000/svg";
  const path = document.createElementNS(ns, "path");
  const d = points.map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  path.setAttribute("d", d);
  path.setAttribute("fill", "rgba(56, 189, 248, 0.1)");
  path.setAttribute("stroke", "rgba(56, 189, 248, 0.8)");
  path.setAttribute("stroke-dasharray", "4 4");
  overlay.appendChild(path);
};
