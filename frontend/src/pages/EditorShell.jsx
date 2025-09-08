import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createProject, getProject, listProjects, saveProject } from "../store/projects";
import AnimationPanel from "../ui/AnimationPanel";
import LayersAccordion from "../ui/LayersAccordion";
import PropertiesPanel from "../ui/PropertiesPanel";
import TabsBar from "../ui/TabsBar";
import Topbar from "../ui/Topbar";
import SvgEditor from "./SvgEditor.jsx";

export default function EditorShell() {
  const { id } = useParams();
  const nav = useNavigate();
  const [playing, setPlaying] = useState(true);
  const [project, setProject] = useState(null);
  const [all, setAll] = useState(listProjects());
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (id) {
      const p = getProject(id);
      if (p) setProject(p);
      else setProject(createProject());
    } else {
      setProject(createProject());
    }
  }, [id]);

  const onChange = (partial) => {
    setProject((p) => {
      const next = { ...(p || {}), ...(partial || {}) };
      saveProject(next);
      setAll(listProjects());
      return next;
    });
  };

  const onNewTab = () => {
    const np = createProject();
    saveProject(np);
    setAll(listProjects());
    nav(`/editor/${np.id}`);
  };

  const onSwitchTab = (id) => {
    if (id && id !== project?.id) nav(`/editor/${id}`);
  };

  useEffect(() => {
    const h = (e) => setSelectedId(e.detail?.id || null);
    window.addEventListener("app:selected-changed", h);
    return () => window.removeEventListener("app:selected-changed", h);
  }, []);

  if (!project) return null;

  return (
    <div className="min-h-full flex flex-col max-h-screen">
      <TabsBar projects={all} activeId={project.id} onChange={onSwitchTab} onNew={onNewTab} />
      <Topbar playing={playing} onPlayToggle={() => setPlaying((v) => !v)} />
      <div className="flex-1 min-h-0 overflow-hidden grid grid-cols-[300px_1fr_340px] gap-0">
        {/* Left panel placeholder for layers (will enhance later) */}
        <aside className="panel m-3 p-3 h-full min-h-0 overflow-auto">
          <LayersAccordion elements={elements} />
        </aside>
        {/* Canvas area */}
        <main className="m-3 h-full min-h-0 overflow-hidden">
          <div className="panel h-full p-3 flex items-center justify-center">
            <SvgEditor
              playingExternal={playing}
              project={project}
              onProjectChange={onChange}
              onElementsChange={setElements}
            />
          </div>
        </main>
        {/* Right properties */}
        <aside className="panel m-3 p-3 h-full min-h-0 overflow-auto space-y-4">
          <div>
            <div className="section-title mb-2">Properties</div>
            <PropertiesPanel selectedId={selectedId} />
          </div>
          <div>
            <div className="section-title mb-2">Animations</div>
            <AnimationPanel selectedId={selectedId} />
          </div>
        </aside>
      </div>
    </div>
  );
}
