import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './architecture.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { cn } from '../../lib/utils'
import { DebugBar, type DebugState } from './DebugBar'
import { buildScene } from './geometry'
import { highlight, type FlowFilter, type Selection } from './highlight'
import { IsoMap } from './IsoMap'
import { isDecisionVisible } from './decisions'
import { NodePanel } from './NodePanel'
import { PROJECTS } from './projects'
import { SourceEditor } from './SourceEditor'
import { FLOWS, ROLES, type Project, type Role } from './types'

const FLOW_TABS: [FlowFilter, string][] = [...(Object.entries(FLOWS) as [FlowFilter, string][]), ['all', 'Todo']]
const NO_SELECTION: Omit<Selection, 'flow'> = { hover: null, pin: null, tech: null }

/** Sección "Proyectos": arquitectura de cada proyecto como mapa isométrico interactivo en estilo risografía. */
export default function ArchitectureSection() {
  const [projectId, setProjectId] = useState(PROJECTS[0].id)
  const original = PROJECTS.find(p => p.id === projectId)!
  // Versión editada desde el JSON; se descarta al cambiar de proyecto
  const [edited, setEdited] = useState<Project | null>(null)
  const project = edited?.id === projectId ? edited : original

  const [sel, setSel] = useState<Selection>({ flow: 'query', ...NO_SELECTION })
  const [debugOn, setDebugOn] = useState(false)
  const [debug, setDebug] = useState<DebugState>({ projection: 'dimetric', hitZones: true, order: false })
  const [sourceOpen, setSourceOpen] = useState(false)

  const { scene, buildMs } = useMemo(() => {
    const t = performance.now()
    const scene = buildScene(project, debugOn ? debug.projection : 'dimetric')
    return { scene, buildMs: performance.now() - t }
  }, [project, debugOn, debug.projection])
  const hl = useMemo(() => highlight(project, sel), [project, sel])
  const withDecision = useMemo(() => new Set(project.nodes.filter(n => isDecisionVisible(n.decision)).map(n => n.id)), [project])

  const onHover = useCallback((hover: string | null) => setSel(s => (s.hover === hover ? s : { ...s, hover })), [])
  const onToggle = useCallback((id: string) => setSel(s => ({ ...s, tech: null, pin: s.pin === id ? null : id })), [])
  const onClear = useCallback(() => setSel(s => ({ ...s, pin: null, tech: null })), [])
  const onApply = useCallback((p: Project) => setEdited(p), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return
      if (e.key === 'Escape') onClear()
      if (e.key.toLowerCase() === 'd' && !e.metaKey && !e.ctrlKey && !e.altKey) setDebugOn(on => !on)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClear])

  // En pantallas estrechas el mapa se desplaza en horizontal: se abre centrado en la losa
  const scrollRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
  }, [projectId])

  const focusNode = sel.hover ?? sel.pin
  return (
    <section id="projects" className="arch-section">
      <div className="arch">
        <header className="arch-head">
          <p className="eyebrow">Proyectos · arquitectura</p>
          <h2>{project.name}</h2>
          <p className="lead">{project.tagline}</p>
          {PROJECTS.length > 1 && (
            <nav className="arch-tabs" aria-label="Proyectos">
              {PROJECTS.map(p => (
                <button key={p.id} type="button" aria-current={p.id === projectId} onClick={() => { setProjectId(p.id); setSel(s => ({ ...s, ...NO_SELECTION })) }}>
                  {p.name}
                </button>
              ))}
            </nav>
          )}
        </header>

        <div className="arch-layout">
          <div className="arch-stage">
            <div className="arch-bar">
              <div className="seg" role="group" aria-label="Flujo">
                {FLOW_TABS.map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={!sel.tech && !focusNode && sel.flow === k} onClick={() => setSel({ flow: k, ...NO_SELECTION })}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="tools">
                <button type="button" className="tool" aria-pressed={debugOn} onClick={() => setDebugOn(on => !on)} title="Tecla D">
                  Cómo está hecho <kbd>D</kbd>
                </button>
                <button type="button" className="tool" aria-pressed={sourceOpen} onClick={() => setSourceOpen(o => !o)}>Fuente</button>
              </div>
            </div>
            {debugOn && <DebugBar state={debug} onChange={setDebug} pieces={scene.pieces.length} buildMs={buildMs} />}
            <div className="arch-scroll" ref={scrollRef}>
              <IsoMap
                scene={scene}
                hl={hl}
                withDecision={withDecision}
                showHitZones={debugOn && debug.hitZones}
                showOrder={debugOn && debug.order}
                title={`Arquitectura de ${project.name}`}
                onHover={onHover}
                onToggle={onToggle}
                onClear={onClear}
              />
            </div>
            <div className="arch-legend">
              {(Object.entries(ROLES) as [Role, { label: string }][]).map(([role, { label }]) => (
                <span key={role} style={{ '--c': `var(--r-${role})` } as CSSProperties}><i />{label}</span>
              ))}
            </div>
          </div>
          <NodePanel
            project={project}
            nodeId={focusNode}
            pinned={!!sel.pin && sel.pin === focusNode}
            tech={sel.tech}
            onTech={t => setSel(s => ({ ...s, pin: null, tech: s.tech === t ? null : t }))}
            onUnpin={onClear}
          />
        </div>

        <div className={cn(!sourceOpen && 'hidden')}>
          <SourceEditor key={projectId} original={original} onApply={onApply} />
        </div>
      </div>
    </section>
  )
}
